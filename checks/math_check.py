"""The 🧮 solver's tool: check math answers with SymPy, independently of the maker (docs/KINDS-MATH.md).

Called by checks/math.mjs as `python3 -I checks/math_check.py` with a JSON list of jobs on stdin; prints a JSON list of
results. Each job: {"where", "check": {type, expr, var, ...}, "qtype", "key": text, "accept": [text], "choices": [text],
"answer": index}. Each result: {"where", "status": "ok" | "wrong" | "unread" | "error", "expected", "notes": [...],
"choices": [{"i", "correct": true | false | null}]}.

Expressions may be plain math ("2x + 3 = 11", "x^3 sin(x)") or LaTeX ("$\\frac{x^2-4}{x-2}$"); both are read here
without any eval of the text as Python beyond SymPy's own parser with a fixed set of names.
"""
import json
import re
import signal
import sys

import sympy as sp
from sympy.parsing.sympy_parser import (convert_xor, implicit_multiplication_application, parse_expr,
                                        standard_transformations)

TRANSFORMS = standard_transformations + (implicit_multiplication_application, convert_xor)
X = sp.Symbol('x')


class Unread(Exception):
    pass


class Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise Timeout()


# ---------- LaTeX (and plain text) to SymPy's input language ----------
def _group(s, i):
    """The {…} group (or single token) starting at s[i]; returns (content, next index)."""
    while i < len(s) and s[i] == ' ':
        i += 1
    if i >= len(s):
        return '', i
    if s[i] == '{':
        depth = 0
        for j in range(i, len(s)):
            if s[j] == '{':
                depth += 1
            elif s[j] == '}':
                depth -= 1
                if depth == 0:
                    return s[i + 1:j], j + 1
        raise Unread('unbalanced braces')
    if s[i] == '\\':
        m = re.match(r'\\([a-zA-Z]+|.)', s[i:])
        return m.group(0), i + len(m.group(0))
    return s[i], i + 1


FUNCS = {'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'ln', 'exp'}
SYMS = {'cdot': '*', 'times': '*', 'div': '/', 'le': '<=', 'leq': '<=', 'ge': '>=', 'geq': '>=', 'ne': '!=',
        'neq': '!=', 'lt': '<', 'gt': '>', 'pi': ' pi ', 'infty': ' oo ', 'theta': ' theta ', 'alpha': ' alpha ',
        'beta': ' beta ', 'lambda': ' lamda ', 'mu': ' mu ', 'sigma': ' sigma ', 'to': '->', 'rightarrow': '->',
        ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', 'quad': ' ', 'qquad': ' ', 'left': '', 'right': '',
        'displaystyle': '', 'big': '', 'Big': '', 'cup': ' U ', '%': '/100', 'pm': '±', 'mp': '∓', '{': '{', '}': '}',
        'lbrace': '{', 'rbrace': '}', 'emptyset': '∅', 'varnothing': '∅', 'circ': '', 'degree': '', 'approx': '='}


def latex_to_text(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == '\\':
            m = re.match(r'\\([a-zA-Z]+|.)', s[i:])
            name = m.group(1)
            i += len(m.group(0))
            if name in ('left', 'right') and i < len(s) and s[i] in '.':
                i += 1
                continue
            if name in ('left', 'right') and s[i:i + 1] == '|':
                out.append('|')
                i += 1
                continue
            if name in ('frac', 'dfrac', 'tfrac'):
                a, i = _group(s, i)
                b, i = _group(s, i)
                out.append('((%s)/(%s))' % (latex_to_text(a), latex_to_text(b)))
            elif name == 'sqrt':
                if i < len(s) and s[i] == '[':
                    j = s.index(']', i)
                    n = s[i + 1:j]
                    a, i = _group(s, j + 1)
                    out.append('root(%s, %s)' % (latex_to_text(a), latex_to_text(n)))
                else:
                    a, i = _group(s, i)
                    out.append('sqrt(%s)' % latex_to_text(a))
            elif name in ('text', 'mathrm', 'textrm', 'mathbf', 'textbf', 'operatorname', 'mbox'):
                a, i = _group(s, i)
                out.append(' %s ' % a)
            elif name == 'log':
                if s[i:i + 1] == '_':
                    b, i = _group(s, i + 1)
                    while i < len(s) and s[i] == ' ':
                        i += 1
                    if s[i:i + 1] == '(':  # \log_2(x): the parenthesised argument
                        depth, j = 0, i
                        while j < len(s):
                            depth += {'(': 1, ')': -1}.get(s[j], 0)
                            j += 1
                            if depth == 0:
                                break
                        a, i = s[i + 1:j - 1], j
                    elif s[i:i + 1] == '{':
                        a, i = _group(s, i)
                    else:  # \log_2 32, \log_3 x
                        m2 = re.match(r'[\w.]+', s[i:])
                        a, i = (m2.group(0), i + len(m2.group(0))) if m2 else _group(s, i)
                    out.append('log(%s, %s)' % (latex_to_text(a), latex_to_text(b)))
                else:
                    out.append(' log10 ')
            elif name in FUNCS:
                out.append(' %s ' % ('log' if name == 'ln' else name))
            elif name in SYMS:
                out.append(SYMS[name])
            elif name in ('begin',):
                env, i = _group(s, i)
                end = s.index('\\end{%s}' % env, i)
                inner = s[i:end]
                i = end + len('\\end{%s}' % env)
                if env in ('pmatrix', 'bmatrix', 'matrix', 'vmatrix'):
                    rows = [r for r in inner.split('\\\\') if r.strip()]
                    out.append('Matrix([%s])' % ', '.join('[%s]' % ', '.join(latex_to_text(c) for c in r.split('&')) for r in rows))
                else:
                    raise Unread('cannot read \\begin{%s}' % env)
            else:
                raise Unread('cannot read \\%s' % name)
            continue
        if c in '^_':
            a, i = _group(s, i + 1)
            if c == '_':
                continue  # subscripts are names only (x_1): dropped
            if a.strip() in ('\\circ',):
                continue
            out.append('**(%s)' % latex_to_text(a))
            continue
        if c == '{':
            out.append('(')
        elif c == '}':
            out.append(')')
        else:
            out.append(c)
        i += 1
    return ''.join(out)


def to_text(raw):
    """The answer text with $ signs, units words and LaTeX turned into SymPy's language."""
    s = str(raw)
    s = s.replace('\\$', '').replace('$', '')
    s = s.replace('−', '-').replace('–', '-').replace('×', '*').replace('·', '*').replace('÷', '/')
    s = s.replace('≤', '<=').replace('≥', '>=').replace('≠', '!=').replace('π', ' pi ').replace('∞', ' oo ').replace('√', 'sqrt')
    s = latex_to_text(s) if '\\' in s or '{' in s or '^' in s else s
    s = re.sub(r'(?<=\d),(?=\d{3}\b)', '', s)  # 1,000
    return s


NAMES = {'e': sp.E, 'E': sp.E, 'pi': sp.pi, 'oo': sp.oo, 'sqrt': sp.sqrt, 'root': sp.root, 'log': sp.log,
         'ln': sp.log, 'exp': sp.exp, 'log10': lambda a: sp.log(a, 10), 'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan,
         'sec': sp.sec, 'csc': sp.csc, 'cot': sp.cot, 'arcsin': sp.asin, 'arccos': sp.acos, 'arctan': sp.atan,
         'sinh': sp.sinh, 'cosh': sp.cosh, 'tanh': sp.tanh, 'Abs': sp.Abs, 'Matrix': sp.Matrix, 'I': sp.I,
         'C': sp.Symbol('C'), 'lamda': sp.Symbol('lamda'), 'Integer': sp.Integer, 'Float': sp.Float,
         'Rational': sp.Rational, 'Symbol': sp.Symbol, 'Function': sp.Function}
UNIT_WORDS = r'\b(units?|square|cubic|sq|cm|mm|m|km|in|ft|yd|mi|inches|feet|foot|yards?|miles?|meters?|centimeters?|g|kg|lb|lbs|oz|s|sec|seconds?|min|minutes?|h|hr|hours?|days?|degrees?|dollars?|cents?|per)\b'


def expr_of(text, evaluate=True):
    t = text.strip()
    if not t:
        raise Unread('empty')
    t = re.sub(r'\|([^|]+)\|', r'Abs(\1)', t)
    t = re.sub(r'\+\s*C\b', '+ C', t)
    t = re.sub(UNIT_WORDS, ' ', t) if re.search(r'\d', t) else t
    t = re.sub(r'\bd[xyt]\b', ' ', t)
    t = re.sub(r'(?<=\d)\s*%', '/100', t)
    t = t.replace('±', '+')  # handled by the caller; here just readable
    try:
        return parse_expr(t, local_dict=dict(NAMES), transformations=TRANSFORMS, evaluate=evaluate)
    except Exception as e:
        raise Unread('cannot read "%s" (%s)' % (text.strip(), type(e).__name__))


REL = re.compile(r'(<=|>=|!=|=|<|>)')


def split_top(s, seps):
    """Split s on any of seps at bracket depth 0."""
    parts, depth, cur, i = [], 0, '', 0
    while i < len(s):
        c = s[i]
        if c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
        if depth == 0:
            hit = next((x for x in seps if s.startswith(x, i)), None)
            if hit:
                parts.append(cur)
                cur, i = '', i + len(hit)
                continue
        cur += c
        i += 1
    parts.append(cur)
    return [p for p in (x.strip() for x in parts) if p]


def relational(text):
    """'x = 4' -> ('=', lhs, rhs); '2x+1' -> None. Chains like 1 < x < 3 give ('chain', [..])."""
    pieces = REL.split(text)
    if len(pieces) == 1:
        return None
    if len(pieces) == 3:
        try:
            lhs = expr_of(pieces[0])
        except Unread:
            if pieces[1] != '=':
                raise
            lhs = sp.Symbol('_label')  # f'(x) = …, dy/dx = …: a name for the answer, not part of it
        return (pieces[1], lhs, expr_of(pieces[2]))
    return ('chain', [expr_of(p) if k % 2 == 0 else p for k, p in enumerate(pieces)])


def answer_parts(raw):
    """An answer as a list of pieces: each an expr, a relation, a point (tuple) or a set marker."""
    low = re.sub(r'[$\\.]', '', str(raw)).strip().lower()
    if low in ('no solution', 'no real solution', 'no real solutions', 'none', 'emptyset', 'varnothing', '∅', '{}'):
        return [('empty',)]
    if low in ('all real numbers', 'infinitely many solutions', 'infinitely many', 'all reals'):
        return [('all',)]
    if low in ('dne', 'does not exist', 'the limit does not exist'):
        return [('dne',)]
    s = to_text(raw)
    s = re.sub(r'^\s*\{(.*)\}\s*$', r'\1', s)
    out = []
    for part in split_top(s, [' or ', ' and ', ',', ';']):
        part = part.strip()
        m = re.match(r'^\((.*)\)$', part)
        if m and len(split_top(m.group(1), [','])) > 1:
            out.append(('point', tuple(expr_of(c) for c in split_top(m.group(1), [',']))))
            continue
        if '±' in part:
            out.append(('pm', part))
            continue
        r = relational(part)
        out.append(('rel', r) if r else ('expr', expr_of(part)))
    return out


# ---------- comparing ----------
def same(a, b, tol=None):
    a, b = sp.sympify(a), sp.sympify(b)
    if a.is_Matrix or b.is_Matrix:
        return a.shape == b.shape and all(same(x, y, tol) for x, y in zip(a, b))
    if a == b:
        return True
    if a.has(sp.oo, -sp.oo, sp.zoo) or b.has(sp.oo, -sp.oo, sp.zoo):
        return False
    free = sorted((a.free_symbols | b.free_symbols), key=str)
    if not free:
        try:
            va, vb = complex(sp.N(a, 30)), complex(sp.N(b, 30))
        except Exception:
            return sp.simplify(a - b) == 0
        if tol is not None:
            return abs(va - vb) <= tol
        return abs(va - vb) <= 1e-9 * max(1, abs(va), abs(vb))
    try:
        if sp.simplify(a - b) == 0:
            return True
    except Exception:
        pass
    # numeric spot checks at a few points (simplify can miss an identity; a real difference shows up)
    import random
    rnd = random.Random(7)
    hits = 0
    for _ in range(12):
        sub = {v: sp.Rational(rnd.randint(-900, 900), rnd.randint(50, 300)) for v in free}
        try:
            va, vb = complex(sp.N(a.subs(sub), 25)), complex(sp.N(b.subs(sub), 25))
        except Exception:
            continue
        if any(map(lambda z: z != z or abs(z) == float('inf'), (va, vb))):
            continue
        if abs(va - vb) > 1e-8 * max(1, abs(va), abs(vb)):
            return False
        hits += 1
    return hits >= 5


REL_OF = {'=': sp.Eq, '<': sp.Lt, '>': sp.Gt, '<=': sp.Le, '>=': sp.Ge, '!=': sp.Ne}


def chain_set(items, var):
    """1 < x <= 3 as a set over the reals."""
    rels = [REL_OF[items[k + 1]](items[k], items[k + 2]) for k in range(0, len(items) - 2, 2)]
    return sp.Intersection(*[sp.solveset(x, var, sp.S.Reals) for x in rels])


def value_set(parts, var):
    """A key like 'x = 2 or x = -3' / '2, -3' / 'x > 3' as a SymPy set over the reals."""
    sets = []
    for p in parts:
        if p[0] == 'empty':
            sets.append(sp.S.EmptySet)
        elif p[0] == 'all':
            sets.append(sp.S.Reals)
        elif p[0] == 'expr':
            sets.append(sp.FiniteSet(p[1]))
        elif p[0] == 'pm':
            txt = p[1].split('=')[-1]
            a, b = txt.split('±', 1)
            base = expr_of(a) if a.strip() else sp.Integer(0)
            d = expr_of(b)
            sets.append(sp.FiniteSet(base + d, base - d))
        elif p[0] == 'rel':
            r = p[1]
            if r[0] == 'chain':
                sets.append(chain_set(r[1], var))
                continue
            op, l, rr = r
            if op == '=' and l == var:
                sets.append(sp.FiniteSet(rr))
            elif op == '=' and rr == var:
                sets.append(sp.FiniteSet(l))
            else:
                rel = {'=': sp.Eq, '<': sp.Lt, '>': sp.Gt, '<=': sp.Le, '>=': sp.Ge, '!=': sp.Ne}[op](l, rr)
                sets.append(sp.solveset(rel, var, sp.S.Reals))
        else:
            raise Unread('a point where a value was expected')
    out = sp.S.EmptySet
    for s in sets:
        out = sp.Union(out, s)
    return out


def sets_equal(a, b):
    if a == b:
        return True
    if isinstance(a, sp.FiniteSet) and isinstance(b, sp.FiniteSet):
        la, lb = list(a), list(b)
        return len(la) == len(lb) and all(any(same(x, y) for y in lb) for x in la) and all(any(same(x, y) for x in la) for y in lb)
    try:
        return sp.Complement(a, b) == sp.S.EmptySet and sp.Complement(b, a) == sp.S.EmptySet
    except Exception:
        return False


def rhs_expr(parts):
    """An expression answer; 'f'(x) = 3x^2' or 'y = 2x + 1' gives the right-hand side."""
    if len(parts) != 1:
        raise Unread('expected one expression')
    p = parts[0]
    if p[0] == 'expr':
        return p[1]
    if p[0] == 'rel' and p[1][0] == '=':
        return p[1][2]
    if p[0] == 'dne':
        return 'DNE'
    raise Unread('expected an expression')


def point_of(parts, names):
    if len(parts) == 1 and parts[0][0] == 'point':
        return parts[0][1]
    vals = {}
    for p in parts:
        if p[0] == 'rel' and p[1][0] == '=' and isinstance(p[1][1], sp.Symbol):
            vals[str(p[1][1])] = p[1][2]
        else:
            raise Unread('expected a point like (2, 5) or x = 2, y = 5')
    if set(vals) != set(names):
        raise Unread('expected values for %s' % ', '.join(names))
    return tuple(vals[n] for n in names)


def parse_check_expr(text):
    t = to_text(text)
    r = relational(t)
    return r if r else expr_of(t)


# ---------- the oracle: what the right answer is, and whether a given answer matches it ----------
def oracle(check):
    typ = check.get('type')
    var = sp.Symbol(check.get('var', 'x'))
    tol = check.get('tol')
    tol = float(tol) if tol is not None else None

    def expr(key='expr'):
        e = parse_check_expr(check[key])
        if isinstance(e, tuple):
            raise Unread('%s should be an expression, not an equation' % key)
        return e

    if typ in ('solve', 'zeros', 'inequality'):
        if typ == 'zeros':
            target = sp.solveset(sp.Eq(expr(), 0), var, sp.S.Reals)
        else:
            r = parse_check_expr(check['expr'])
            if not isinstance(r, tuple):
                target = sp.solveset(sp.Eq(r, 0), var, sp.S.Reals)
            elif r[0] == 'chain':
                target = chain_set(r[1], var)
            else:
                op, l, rr = r
                rel = {'=': sp.Eq, '<': sp.Lt, '>': sp.Gt, '<=': sp.Le, '>=': sp.Ge, '!=': sp.Ne}[op](l, rr)
                target = sp.solveset(rel, var, sp.S.Reals)
        return str(target), lambda ans: sets_equal(value_set(answer_parts(ans), var), target)

    if typ in ('system', 'intersection'):
        names = check.get('vars') or ['x', 'y']
        syms = [sp.Symbol(n) for n in names]
        eqs = []
        if typ == 'intersection':
            fs = [expr_of(to_text(e).split('=')[-1]) for e in check['exprs']]
            eqs = [sp.Eq(sp.Symbol('y'), fs[0]), sp.Eq(sp.Symbol('y'), fs[1])]
            syms, names = [sp.Symbol('x'), sp.Symbol('y')], ['x', 'y']
        else:
            for e in check['exprs']:
                r = parse_check_expr(e)
                if not isinstance(r, tuple) or r[0] != '=':
                    raise Unread('each equation in a system needs one "="')
                eqs.append(sp.Eq(r[1], r[2]))
        sols = sp.solve(eqs, syms, dict=True)
        pts = [tuple(s.get(v, v) for v in syms) for s in sols]
        if not pts:
            return 'no solution', lambda ans: answer_parts(ans)[0][0] == 'empty'
        if any(any(c.free_symbols for c in p) for p in pts):
            return 'infinitely many', lambda ans: answer_parts(ans)[0][0] == 'all'

        def ok(ans):
            parts = answer_parts(ans)
            given = [p[1] for p in parts if p[0] == 'point'] if all(p[0] == 'point' for p in parts) else [point_of(parts, names)]
            return len(given) == len(pts) and all(any(all(same(a, b, tol) for a, b in zip(g, p)) for p in pts) for g in given)
        return ', '.join('(%s)' % ', '.join(map(str, p)) for p in pts), ok

    if typ == 'derivative':
        f = expr()
        d = sp.diff(f, var, int(check.get('order', 1)))
        if check.get('at') is not None:
            d = d.subs(var, expr_of(to_text(str(check['at']))))
        return str(d), lambda ans: same(rhs_expr(answer_parts(ans)), d, tol)

    if typ == 'integral':
        f = expr()
        if check.get('from') is not None:
            a, b = expr_of(to_text(str(check['from']))), expr_of(to_text(str(check['to'])))
            v = sp.integrate(f, (var, a, b))
            return str(v), lambda ans: same(rhs_expr(answer_parts(ans)), v, tol)
        anti = sp.integrate(f, var)

        def ok(ans):
            k = rhs_expr(answer_parts(ans))
            if k == 'DNE':
                return False
            return same(sp.diff(k, var), f)  # equal up to a constant: + C or not
        return str(anti) + ' + C', ok

    if typ == 'limit':
        f = expr()
        to = check.get('to')
        to = sp.oo if str(to) in ('oo', 'inf', 'infinity', '\\infty') else -sp.oo if str(to) in ('-oo', '-inf', '-\\infty') else expr_of(to_text(str(to)))
        dirn = check.get('dir', '+-')
        if dirn == '+-' and to not in (sp.oo, -sp.oo):
            left, right = sp.limit(f, var, to, '-'), sp.limit(f, var, to, '+')
            L = left if left == right else 'DNE'
        else:
            L = sp.limit(f, var, to, dirn if to not in (sp.oo, -sp.oo) else '-' if to == sp.oo else '+')

        def ok(ans):
            k = rhs_expr(answer_parts(ans))
            if L == 'DNE' or k == 'DNE':
                return L == k
            if L in (sp.oo, -sp.oo, sp.zoo):
                return k == L
            return same(k, L, tol)
        return str(L), ok

    if typ in ('equivalent', 'simplify', 'evaluate', 'value'):
        target = parse_check_expr(check['expr'])
        if isinstance(target, tuple):  # an equation: the key must be an equivalent equation
            op, l, r = target
            if op == 'chain':
                raise Unread('an equivalent check takes an expression or one equation')

            def ok_eq(ans):
                parts = answer_parts(ans)
                if len(parts) != 1 or parts[0][0] != 'rel' or parts[0][1][0] != op:
                    return False
                _, l2, r2 = parts[0][1]
                q = sp.simplify((l2 - r2) / (l - r))
                return bool(q.is_number and q != 0 and (op in ('=', '!=') or q > 0))
            return '%s %s %s' % (l, op, r), ok_eq
        return str(target), lambda ans: same(rhs_expr(answer_parts(ans)), target, tol)

    if typ == 'factor':
        f = expr()

        def ok(ans):
            k_text = to_text(ans).split('=')[-1]
            k = expr_of(k_text, evaluate=False)
            if not same(sp.expand(k.doit() if hasattr(k, 'doit') else k), sp.expand(f)):
                return False
            # fully factored: every factor written is irreducible over the rationals
            factors = []

            def walk(e):
                if isinstance(e, sp.Mul):
                    for a in e.args:
                        walk(a)
                elif isinstance(e, sp.Pow) and e.exp.is_Integer and e.exp > 0:
                    walk(e.base)
                else:
                    factors.append(e)
            walk(k)
            for fac in factors:
                fac = fac.doit() if hasattr(fac, 'doit') else fac
                if fac.is_number or not fac.free_symbols:
                    continue
                c, lst = sp.factor_list(sp.expand(fac))
                if sum(m for _, m in lst) > 1 or abs(c) != 1:  # splits further, or a common factor is left inside
                    return False
            return True
        return str(sp.factor(f)), ok

    if typ == 'vertex':
        f = sp.expand(expr())
        p = sp.Poly(f, var)
        if p.degree() != 2:
            raise Unread('vertex needs a quadratic')
        a, b, _ = p.all_coeffs()
        h = -b / (2 * a)
        k = f.subs(var, h)
        return '(%s, %s)' % (h, k), lambda ans: (lambda pt: len(pt) == 2 and same(pt[0], h) and same(pt[1], k))(point_of(answer_parts(ans), ['x', 'y']))

    if typ == 'asymptote':
        f = sp.together(expr())
        kind = check.get('kind', 'vertical')
        if kind == 'vertical':
            num, den = sp.fraction(sp.cancel(f))
            vals = sp.solveset(sp.Eq(den, 0), var, sp.S.Reals)
            return 'x = %s' % vals, lambda ans: sets_equal(value_set(answer_parts(ans), var), vals)
        if kind == 'horizontal':
            L1, L2 = sp.limit(f, var, sp.oo), sp.limit(f, var, -sp.oo)
            vals = sp.FiniteSet(*[v for v in {L1, L2} if v.is_finite])
            ysym = sp.Symbol('y')
            return 'y = %s' % vals, lambda ans: sets_equal(value_set(answer_parts(ans), ysym), vals)
        if kind == 'slant':
            q, _ = sp.div(*sp.fraction(sp.cancel(f)), var)
            return 'y = %s' % q, lambda ans: same(rhs_expr(answer_parts(ans)), q)
        raise Unread('asymptote kind is vertical, horizontal or slant')

    if typ == 'tangent':
        f = expr()
        a = expr_of(to_text(str(check['at'])))
        line = sp.expand(sp.diff(f, var).subs(var, a) * (var - a) + f.subs(var, a))
        return 'y = %s' % line, lambda ans: same(rhs_expr(answer_parts(ans)), line)

    raise Unread('unknown check type %r' % typ)


def run(job):
    res = {'where': job.get('where'), 'notes': []}
    check = job.get('check') or {}
    try:
        expected, ok = oracle(check)
    except Unread as e:
        return dict(res, status='error', notes=['the check itself: %s' % e])
    except Timeout:
        raise
    except Exception as e:
        return dict(res, status='error', notes=['the check itself: %s: %s' % (type(e).__name__, e)])
    res['expected'] = expected

    rounded_ok = {}

    def judge(text):
        try:
            v = bool(ok(text))
            m = re.fullmatch(r'\s*\$?\s*(-?\d*\.(\d+))\s*\$?\s*', str(text))
            if not v and m and check.get('tol') is None:
                # a decimal written to d places: right when the exact answer rounds to it
                d = len(m.group(2))
                _, ok_r = oracle(dict(check, tol=0.5 * 10 ** -d + 1e-12))
                if ok_r(text):
                    rounded_ok[text] = d
                    return True, None
            return v, None
        except Unread as e:
            return None, str(e)
        except Timeout:
            raise
        except Exception as e:
            return None, '%s: %s' % (type(e).__name__, e)

    if job.get('qtype') == 'mc':
        chs = job.get('choices') or []
        verdicts = []
        for i, c in enumerate(chs):
            v, why = judge(c)
            verdicts.append({'i': i, 'correct': v})
            if v is None:
                res['notes'].append('could not read choice %s ("%s"): %s' % ('ABCDEF'[i], c, why))
        res['choices'] = verdicts
        right = [v['i'] for v in verdicts if v['correct']]
        key = job.get('answer')
        if key is None or not isinstance(key, int) or key >= len(chs) or verdicts[key]['correct'] is None:
            res['status'] = 'unread'
        elif not verdicts[key]['correct']:
            res['status'] = 'wrong'
            res['notes'].insert(0, 'the key (%s) is not right; SymPy gets %s%s' % ('ABCDEF'[key], expected, (', which is choice ' + ', '.join('ABCDEF'[i] for i in right)) if right else ''))
        elif len(right) > 1:
            res['status'] = 'wrong'
            res['notes'].insert(0, 'more than one choice is right: %s (equivalent to the key)' % ', '.join('ABCDEF'[i] for i in right))
        else:
            unread = [v for v in verdicts if v['correct'] is None]
            res['status'] = 'unread' if unread else 'ok'
        return res

    v, why = judge(job.get('key', ''))
    if v is None:
        return dict(res, status='unread', notes=['could not read the key "%s": %s' % (job.get('key'), why)])
    if not v:
        return dict(res, status='wrong', notes=['the key "%s" is not right; SymPy gets %s' % (job.get('key'), expected)])
    status = 'ok'
    for a in job.get('accept') or []:
        va, why = judge(a)
        if va is False:
            status = 'wrong'
            res['notes'].append('accept form "%s" is not right (SymPy gets %s)' % (a, expected))
        elif va is None:
            res['notes'].append('could not read accept form "%s": %s' % (a, why))
    for t, d in rounded_ok.items():
        res['notes'].append('"%s" is right when rounded to %d decimal place%s' % (t, d, '' if d == 1 else 's'))
    return dict(res, status=status)


def main():
    jobs = json.load(sys.stdin)
    out = []
    signal.signal(signal.SIGALRM, _alarm)
    for job in jobs:
        signal.alarm(int(job.get('timeout', 20)))
        try:
            out.append(run(job))
        except Timeout:
            out.append({'where': job.get('where'), 'status': 'error', 'notes': ['SymPy took too long']})
        finally:
            signal.alarm(0)
    json.dump(out, sys.stdout)


if __name__ == '__main__':
    main()
