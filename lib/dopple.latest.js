"use strict";

function isSpace(e) {
    return " " == e || "	" == e || "\r" == e || "\n" == e;
}

function isNewline(e) {
    return "\r" === e || "\n" === e;
}

function isDigit(e) {
    return e >= "0" && "9" >= e || "." === e;
}

function isAlpha(e) {
    return e >= "a" && "z" >= e || e >= "A" && "Z" >= e || "_" == e && "$" >= e;
}

function isAlphaNum(e) {
    return e >= "a" && "z" >= e || e >= "A" && "Z" >= e || e >= "0" && "9" >= e || "_" === e || "$" === e;
}

function isBinOp(e) {
    return "=" === e || "<" === e || ">" === e || "+" === e || "-" === e || "*" === e || "/" === e;
}

function ToHex(e) {
    return "\\x" + e.toString(16);
}

function Token() {
    this.type = 0, this.str = "", this.value = 0;
}

function Tokenizer() {
    this.buffer = "", this.bufferLength = 0, this.cursor = 0, this.currChar = "";
}

function ObjectDef(e) {
    this.name = e, this.vars = {};
}

function Lexer() {
    this.tokenizer = new Tokenizer(), this.token = null, this.prevToken = null, this.optimizer = new Optimizer(), 
    this.precedence = {
        "=": 2,
        "<": 100,
        ">": 100,
        "+": 200,
        "-": 200,
        "*": 400,
        "/": 400
    }, this.global = new Scope(), this.scope = this.global, this.genID = 0, this.currVar = null, 
    this._skipNextToken = !1, this.varEnum = Variable.Type, this.exprEnum = Expression.Type;
}

function Scope(e) {
    this.parent = e || null, this.vars = {}, this.defBuffer = [], this.varBuffer = [];
}

function Optimizer() {
    this.exprEnum = Expression.Type;
}

function Compiler(e) {
    this.lexer = null, this.createLexer(), this.varMap = {}, this.varMap[Variable.Type.UNKNOWN] = "void ", 
    this.varMap[Variable.Type.NUMBER] = "double ", this.varMap[Variable.Type.BOOL] = "int32_t", 
    this.varMap[Variable.Type.STRING] = "const char *", this.varMap[Variable.Type.STRING_OBJ] = "const char *", 
    this.library = e || "", this.tabs = "", this.output = "", this.global = this.lexer.global, 
    this.scope = null, this.exprEnum = Expression.Type, this.varEnum = Variable.Type;
}

var dopple = {
    compile: function(e, t) {
        var r = new Compiler(t);
        return r.compile(e);
    }
};

"undefined" != typeof exports ? (dopple.isNodeJS = !0, module.exports.dopple = dopple) : dopple.isNodeJS = !1, 
"use strict", dopple.Error = {
    REFERENCE_ERROR: 1,
    UNEXPECTED_EOI: 2,
    INVALID_REGEXP: 10,
    INVALID_TYPE_CONVERSION: 1e3,
    TOO_MANY_ARGUMENTS: 1001
}, dopple.throw = function(e, t) {
    if (e === this.Error.REFERENCE_ERROR) throw "ReferenceError: " + t + " is not defined";
    if (e === this.Error.UNEXPECTED_EOI) throw "SyntaxError: Unexpected end of input";
    if (e === this.Error.INVALID_REGEXP) throw "SyntaxError: Invalid regular expression: missing " + t;
    if (e === this.Error.INVALID_TYPE_CONVERSION) throw "Invalid Type Conversion: " + t;
    if (e === this.Error.TOO_MANY_ARGUMENTS) throw "Too many arguments passed.";
    throw "Unknown";
}, "use strict", "use strict", Token.Type = {
    EOF: 0,
    SYMBOL: -10,
    BINOP: -11,
    NUMBER: -12,
    BOOL: -13,
    STRING: -14,
    VAR: -20,
    RETURN: -21,
    FUNCTION: -22
}, "use strict", Tokenizer.prototype = {
    setBuffer: function(e) {
        this.buffer = e, this.bufferLength = e.length, this.cursor = 0, this.currChar = "";
    },
    token: function() {
        var e = new Token();
        for (this.nextChar(); isSpace(this.currChar); ) this.nextChar();
        if (isAlpha(this.currChar)) {
            for (e.str += this.currChar, this.nextChar(); isAlphaNum(this.currChar); ) e.str += this.currChar, 
            this.nextChar();
            return this.cursor--, "var" === e.str ? e.type = Token.Type.VAR : "return" === e.str ? e.type = Token.Type.RETURN : "function" === e.str ? e.type = Token.Type.FUNCTION : "true" === e.str ? (e.type = Token.Type.BOOL, 
            e.value = 1) : e.type = "false" === e.str ? Token.Type.BOOL : Token.Type.STRING, 
            e;
        }
        if (isDigit(this.currChar)) {
            for (e.str += this.currChar, this.nextChar(); isDigit(this.currChar); ) e.str += this.currChar, 
            this.nextChar();
            return this.cursor--, e.type = Token.Type.NUMBER, e.value = parseFloat(e.str), e;
        }
        if (isBinOp(this.currChar)) {
            if (e.str = this.currChar, "-" === this.currChar) {
                if (this.nextChar(), isDigit(this.currChar)) {
                    for (;isDigit(this.currChar); ) e.str += this.currChar, this.nextChar();
                    return e.value = parseFloat(e.str), e.type = Token.Type.NUMBER, this.cursor--, e;
                }
                this.cursor--;
            }
            return e.type = Token.Type.BINOP, e;
        }
        return "\x00" === this.currChar ? (e.type = Token.Type.EOF, e) : (e.type = Token.Type.SYMBOL, 
        e.str = this.currChar, e);
    },
    nextChar: function(e) {
        return this.cursor >= this.bufferLength ? (this.currChar = "\x00", void 0) : (this.currChar = this.buffer.charAt(this.cursor), 
        this.cursor++, void 0);
    },
    readUntil: function(e) {
        var t = "";
        for (this.nextChar(); this.currChar !== e && "\x00" !== this.currChar; ) "\\" === this.currChar && (t += "\\", 
        this.nextChar()), t += this.currChar, this.nextChar();
        return t;
    },
    skipUntil: function(e) {
        for (this.nextChar(); this.currChar !== e && "\x00" !== this.currChar; ) this.nextChar();
    },
    skipUntilNewline: function() {
        for (this.nextChar(); "\r" !== this.currChar && "\n" !== this.currChar && "\x00" !== this.currChar; ) this.nextChar();
    }
}, "use strict", "use strict", Lexer.prototype = {
    read: function(e) {
        try {
            this.tokenizer.setBuffer(e), this.parseBody();
        } catch (e) {
            return console.error(e), !1;
        }
        return !0;
    },
    nextToken: function() {
        this.token = this.tokenizer.token();
    },
    getTokenPrecendence: function() {
        if (this.token.type !== Token.Type.BINOP) return -1;
        var e = this.precedence[this.token.str];
        return void 0 === e ? -1 : e;
    },
    parseBody: function() {
        var e, t = Token.Type;
        do this._skipNextToken ? this._skipNextToken = !1 : this.nextToken(), e = this.token.type, 
        e === t.VAR ? this.parseVarExpr() : e === t.STRING ? this.parseVarExpr() : e === t.FUNCTION ? this.parseFunction() : e === t.RETURN ? this.parseReturn() : "/" === this.token.str ? (this.nextToken(), 
        "/" === this.token.str ? this.tokenizer.skipUntilNewline() : "*" === this.token.str ? this.tokenizer.skipUntil("/") : dopple.throw(dopple.Error.INVALID_REGEXP, this.token.str)) : '"' === this.token.str && this.tokenizer.skipUntil('"'); while (this.token.type !== t.EOF && "}" !== this.token.str);
    },
    parseExpression: function() {
        var e = this.parsePrimary();
        return e ? this.parseBinOpRHS(0, e) : null;
    },
    parseBinOpRHS: function(e, t) {
        for (;;) {
            var r = this.getTokenPrecendence();
            if (e > r) return t;
            var s = this.token.str;
            this.nextToken();
            var i = this.parsePrimary();
            if (!i) return null;
            var n = this.getTokenPrecendence();
            if (n > r && (i = this.parseBinOpRHS(r + 1, i), !i)) return null;
            t = new Expression.Binary(s, t, i);
        }
        return t;
    },
    parsePrimary: function() {
        return this.token.type === Token.Type.NUMBER ? this.parseNumber() : this.token.type === Token.Type.STRING ? this.parseVar() : this.token.type === Token.Type.BOOL ? this.parseBool() : '"' === this.token.str || "'" === this.token.str ? this.parseString() : "{" === this.token.str ? this.parseObject() : null;
    },
    parseNumber: function() {
        var e = new Expression.Number(this.token.value);
        return this.nextToken(), e;
    },
    parseBool: function() {
        var e = new Expression.Bool(this.token.value);
        return this.nextToken(), e;
    },
    parseString: function() {
        var e = this.token.str, t = this.tokenizer.readUntil(e);
        if (this.tokenizer.currChar !== e) return null;
        var r = new Expression.StringObj(t);
        return this.nextToken(), r;
    },
    parseVar: function() {
        var e = this.scope.vars[this.token.str];
        e || dopple.throw(dopple.Error.REFERENCE_ERROR, this.token.str);
        var t = new Expression.Var(this.token.str);
        return t.expr = t, t.var = e, t.type = e.type, t.value = this.token.str, this.nextToken(), 
        t;
    },
    parseObject: function() {
        var e = "";
        e = this.scope === this.global ? "S" + this.currVar.name : "__Sanonym" + this.genID++ + "__";
        var t = new ObjectDef(e), r = new Expression.Object(e, t);
        return this.nextToken(), "}" !== this.token.str && dopple.throw(dopple.Error.UNEXPECTED_EOI), 
        this.scope.defBuffer.push(t), this.scope === this.global, r;
    },
    parseVarExpr: function() {
        var e = !1, t = !1;
        if (this.token.type !== Token.Type.STRING) {
            if (this.nextToken(), this.token.type !== Token.Type.STRING) throw "Error";
            e = !0;
        }
        var r = this.token.str;
        if (this.nextToken(), "(" === this.token.str) this.parseFuncCall(r); else {
            var s = new Expression.Var(r), i = this.scope.vars[r];
            if (void 0 === i ? (e || dopple.throw(dopple.Error.REFERENCE_ERROR, r), i = s, t = !0, 
            this.scope.vars[r] = s, this.scope.defBuffer.push(s)) : this.scope.varBuffer.push(s), 
            s.var = i, this.currVar = i, "=" === this.token.str && (this.nextToken(), s.expr = this.parseExpression(), 
            s.expr = this.optimizer.do(s.expr), s.analyse(), t && this.scope === this.global)) {
                var n = s.expr.exprType;
                (n === this.exprEnum.BINARY || n === this.exprEnum.VAR) && this.scope.varBuffer.push(s);
            }
        }
    },
    parseFuncCall: function(e) {
        var t = this.scope.vars[e];
        t || dopple.throw(dopple.Error.REFERENCE_ERROR, e);
        var r = 0, s = new Array(t.numParams), i, n, p = t.params, o = p.length;
        if (this.nextToken(), ")" !== this.token.str) for (;;r++) {
            if (r >= o && dopple.throw(dopple.Error.TOO_MANY_ARGUMENTS), n = this.parseExpression(), 
            n = this.optimizer.do(n), n.analyse(), s[r] = n, i = p[r], 0 === i.type && (i.type = n.type), 
            "," !== this.token.str) {
                r++;
                break;
            }
            this.nextToken();
        }
        for (;o > r; r++) s[r] = p[r];
        var h = new Expression.FunctionCall(t, s);
        this.scope.varBuffer.push(h);
    },
    parseReturn: function() {
        var e = null, t = Token.Type;
        if (this.nextToken(), this.token.type === t.VAR || this.token.type === t.NUMBER || this.token.type === t.STRING) {
            var r = new Expression.Var("");
            r.expr = this.parseExpression(), r.expr = this.optimizer.do(r.expr), r.var = r.expr, 
            r.analyse();
        }
        var s = new Expression.Return(r);
        this.scope.varBuffer.push(s);
    },
    parseFunction: function() {
        this.nextToken();
        var e = this.token.str;
        if (this.nextToken(), "(" !== this.token.str) throw "Error: not (";
        this.scope = new Scope(this.scope);
        var t, r = [];
        for (this.nextToken(); this.token.type === Token.Type.STRING; ) {
            if (t = new Expression.Var(this.token.str), t.var = t, r.push(t), this.scope.vars[t.name] = t, 
            this.nextToken(), "," !== this.token.str) {
                if (")" === this.token.str) break;
                throw "Error: not ,";
            }
            this.nextToken();
        }
        if (")" !== this.token.str) throw "Error: not )";
        this.nextToken(), "{" !== this.token.str && dopple.throw(dopple.Error.UNEXPECTED_EOI), 
        this.parseBody(), "}" !== this.token.str && dopple.throw(dopple.Error.UNEXPECTED_EOI);
        var s = new Expression.Function(e, this.scope, r), i = this.scope.parent;
        i.vars[e] = s, i.defBuffer.push(s), this.scope = this.scope.parent, this.nextToken(), 
        this._skipNextToken = !0;
    },
    externFunc: function(e, t) {
        var r = null;
        if (t) {
            r = [];
            for (var s, i, n, p = t.length, o = 0; p > o; o += 2) n = t[o], n === this.varEnum.NUMBER ? i = new Expression.Number(0) : n === this.varEnum.STRING ? i = new Expression.String("") : n === this.varEnum.STRING_OBJ && (i = new Expression.StringObj("")), 
            s = new Expression.Var(t[o + 1]), s.type = n, s.var = i, r.push(s);
        }
        var h = new Expression.Function(e, this.global, r);
        this.global.vars[e] = h;
    }
}, "use strict", Optimizer.prototype = {
    do: function(e) {
        return e.exprType !== Expression.Type.BINARY ? e : e.lhs || e.rhs ? this._doExpr(e) : e;
    },
    _doExpr: function(e) {
        var t = e.lhs.exprType, r = e.rhs.exprType;
        if (t === this.exprEnum.BINARY && (e.lhs = this._doExpr(e.lhs), t = e.lhs.exprType), 
        r === this.exprEnum.BINARY && (e.rhs = this._doExpr(e.rhs), r = e.rhs.exprType), 
        t !== this.exprEnum.NUMBER && t !== this.exprEnum.STRING_OBJ || r !== this.exprEnum.NUMBER && r !== this.exprEnum.STRING_OBJ) return e;
        var s, i = e.op;
        return "+" === i ? s = e.lhs.value + e.rhs.value : "-" === i ? s = e.lhs.value - e.rhs.value : "*" === i ? s = e.lhs.value * e.rhs.value : "/" === i && (s = e.lhs.value / e.rhs.value), 
        "string" == typeof s ? new Expression.StringObj(s) : new Expression.Number(s);
    }
}, "use strict";

var Expression = {};

Expression.Base = function(e) {
    this.type = 0, this.exprType = e || 0;
}, Expression.Base.prototype = {
    analyse: function() {},
    to: function(e) {
        return "void";
    },
    strType: function() {
        var e = Variable.Type;
        for (var t in e) if (e[t] === this.type) return t;
        return "";
    },
    strExprType: function() {
        var e = Variable.Type;
        for (var t in Expression.Type) if (e[t] === this.exprType) return t;
        return "";
    }
}, Expression.Type = {
    VOID: 0,
    VAR: 1,
    NUMBER: 2,
    BOOL: 3,
    STRING: 4,
    STRING_OBJ: 5,
    BINARY: 6,
    FUNCTION: 7,
    FUNCTION_CALL: 8,
    PROTOTYPE: 9,
    OBJECT: 10,
    RETURN: 11
};

var Variable = {
    Type: {
        VOID: 0,
        NUMBER: 1,
        BOOL: 2,
        STRING: 3,
        STRING_OBJ: 4,
        OBJECT: 5,
        FORMAT: 6,
        ARGUMENTS: 7,
        SCOPE: 8
    }
};

"use strict", Expression.Number = function(e) {
    this.value = e, this.type = Variable.Type.NUMBER;
}, Expression.Number.prototype = new Expression.Base(Expression.Type.NUMBER), Expression.Number.prototype.castTo = function(e) {
    if (this.type === e.type) return this.value;
    var t = Variable.Type;
    return e.type === t.STRING ? '"' + this.value + '"' : e.type === t.STRING_OBJ ? '"' + e.var.hexLength(this.value) + '""' + this.value + '"' : (dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, this), 
    void 0);
}, Expression.Number.prototype.defaultValue = function() {
    return "0";
}, "use strict", Expression.Bool = function(e) {
    this.value = 1 * e, this.type = Variable.Type.BOOL;
}, Expression.Bool.prototype = new Expression.Base(Expression.Type.BOOL), "use strict", 
Expression.String = function(e) {
    this.value = e || "", this.type = Variable.Type.STRING;
}, Expression.String.prototype = new Expression.Base(Expression.Type.STRING), Expression.String.prototype.defaultValue = function() {
    return '""';
}, "use strict", Expression.StringObj = function(e) {
    this.value = e || "", this.type = Variable.Type.STRING_OBJ, this.length = this.hexLength(e.length);
}, Expression.StringObj.prototype = new Expression.Base(Expression.Type.STRING_OBJ), 
Expression.StringObj.prototype.castTo = function(e) {
    if (this.type === e.type) return '"' + this.length + '""' + this.value + '"';
    var t = Variable.Type;
    if (e.type === t.NUMBER) {
        var r = Number(this.value) || -1;
        return r;
    }
    return e.type === t.STRING ? '"' + this.value + '"' : (dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, '"' + e.name + '" from ' + this.strType() + " to " + e.strType()), 
    void 0);
}, Expression.StringObj.prototype.defaultValue = function() {
    return '"\\x0\\x0\\x0\\x0"""';
}, Expression.StringObj.prototype.hexLength = function(e) {
    return ToHex(e) + "\\x0\\x0\\x0";
}, "use strict", Expression.Var = function(e) {
    this.name = e || "", this.expr = null, this.var = null, this.value = "";
}, Expression.Var.prototype = new Expression.Base(Expression.Type.VAR), Expression.Var.prototype.castTo = function(e) {
    if (this.type === e.type) return this.value;
    var t = Variable.Type;
    return e.type === t.STRING ? "(" + this.value + " + sizeof(int32_t))" : (dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, '"' + e.name + '" from ' + this.strType() + " to " + e.strType()), 
    void 0);
}, Expression.Var.prototype.analyse = function() {
    this.type = this.expr.type;
}, "use strict", Expression.Binary = function(e, t, r) {
    this.op = e, this.lhs = t, this.rhs = r;
}, Expression.Binary.prototype = new Expression.Base(Expression.Type.BINARY), Expression.Binary.prototype.analyse = function() {
    var e;
    e = binExpr.lhs.exprType === Expression.Type.BINARY ? this.analyseBinExpr(binExpr.lhs) : binExpr.lhs.type;
    var t;
    if (t = binExpr.rhs.exprType === Expression.Type.BINARY ? this.analyseBinExpr(binExpr.rhs) : binExpr.rhs.type, 
    e !== t) {
        if (e === Variable.Type.STRING_OBJ || t === Variable.Type.STRING_OBJ) return Variable.Type.STRING_OBJ;
        Lexer.throw(Lexer.Error.INVALID_TYPE_CONVERSION, '"' + this.var.name + '" ' + binExpr.lhs.strType() + " to " + binExpr.rhs.strType());
    }
    this.type = e;
}, "use strict", Expression.Function = function(e, t, r) {
    this.name = e, this.scope = t, this.params = r, this.numParams = r ? r.length : 0, 
    this.returnVar = new Expression.Var("");
}, Expression.Function.prototype = new Expression.Base(Expression.Type.FUNCTION), 
"use strict", Expression.FunctionCall = function(e, t) {
    this.func = e, this.args = t;
}, Expression.FunctionCall.prototype = new Expression.Base(Expression.Type.FUNCTION_CALL), 
"use strict", Expression.Return = function(e) {
    this.expr = e;
}, Expression.Return.prototype = new Expression.Base(Expression.Type.RETURN), "use strict", 
Expression.Object = function(e, t) {
    this.name = e, this.str = "[object Object]", this.type = Variable.Type.OBJECT, this.def = t;
}, Expression.Object.prototype = new Expression.Base(Expression.Type.OBJECT), "use strict", 
Compiler.prototype = {
    createLexer: function() {
        this.lexer = new Lexer(), this.lexer.externFunc("alert", [ Variable.Type.STRING, "str" ]), 
        this.lexer.externFunc("confirm", [ Variable.Type.STRING, "str" ]);
    },
    compile: function(e) {
        if (this.lexer.read(e)) try {
            return this.make();
        } catch (e) {
            console.error(e);
        }
        return "";
    },
    make: function() {
        this.output = this.library + "\n\n", this.define(this.global), this.output += "int main(int argc, char *argv[]) \n{\n", 
        this.incTabs();
        var e, t = this.lexer.global.varBuffer, r = t.length;
        if (r) {
            var s, i, n = Expression.Type;
            for (e = 0; r > e; e++) s = t[e], i = s.exprType, i === n.VAR ? this.makeVar(s) : i === n.FUNCTION ? this.output += this.tabs + this.makeFunction(s) : i === n.FUNCTION_CALL && this.makeFuncCall(s);
            this.output += "\n";
        }
        return this.output += this.tabs + "return 0;\n", this.output += "}\n", this.output;
    },
    define: function(e) {
        this.scope = e;
        var t, r, s, i = Expression.Type, n = e.defBuffer, p = n.length;
        if (p) for (t = 0; p > t; t++) r = n[t], s = r.exprType, s === i.VAR ? this.defineVar(r) : s === i.FUNCTION ? this.defineFunc(r) : s === i.FUNCTION_CALL ? this.defineFuncCall(r) : s === i.OBJECT ? this.defineObject(r) : s === i.RETURN ? this.defineReturn(r) : console.log("unhandled");
        var o = e.varBuffer, h = o.length;
        if (h) for (t = 0; h > t; t++) r = o[t], s = r.exprType, s === i.RETURN && this.defineReturn(r);
        (p || h) && (this.output += "\n");
    },
    defineVar: function(e) {
        if (e.type === Variable.Type.VOID) return console.warn("[Compiler.makeVar]:", 'Variable "' + e.name + '" is discarded - void type.'), 
        void 0;
        this.output += this.tabs;
        var t = e.expr, r = t.exprType;
        r === this.exprEnum.VAR ? this.output += this.scope === this.global ? this.varMap[e.type] + e.name + ";\n" : this.varMap[e.type] + e.name + " = " + t.name + ";\n" : r === this.exprEnum.STRING_OBJ ? this.output += this.varMap[e.type] + e.name + ' = "' + t.length + '""' + t.value + '";\n' : this.scope === this.global && e.expr.exprType === Expression.Type.BINARY ? this.output += this.varMap[e.type] + e.name + ";\n" : (this.output += this.varMap[e.type] + e.name + " = ", 
        this.defineExpr(t), this.output += ";\n");
    },
    defineExpr: function(e) {
        var t = e.exprType, r = Expression.Type;
        t === r.NUMBER || t === r.VAR ? this.output += e.value : t === r.BINARY && (this.defineExpr(e.lhs), 
        this.output += " " + e.op + " ", this.defineExpr(e.rhs));
    },
    defineFunc: function(e) {
        var t = e.params, r = 0;
        if (t && (r = t.length), this.output += "\n" + this.varMap[e.returnVar.type] + e.name + "(", 
        r) {
            for (var s, i = 0; r - 1 > i; i++) s = t[i], this.output += this.varMap[s.type] + s.name + ", ";
            s = t[i], this.output += this.varMap[s.type] + s.name;
        }
        this.output += ") \n{\n", this.incTabs(), this.define(e.scope), this.decTabs(), 
        this.output += "}\n";
    },
    defineObject: function(e) {
        this.output += "typedef struct " + e.name + " {\n", this.output += "} " + e.name + ";\n";
    },
    defineReturn: function(e) {
        this.output += this.tabs, e.expr ? (this.output += "return ", this.defineExpr(e.expr), 
        this.output += ";\n") : this.output += "return;\n";
    },
    makeVar: function(e) {
        if (e.type === Variable.Type.VOID) return console.warn("[Compiler.makeVar]:", 'Variable "' + e.name + '" is discarded - void type.'), 
        "";
        this.output += this.tabs + e.name + " = ";
        var t = Expression.Type, r = e.expr;
        this.output += r.exprType === t.NUMBER ? r.value : r.exprType === t.VAR ? r.name : r.exprType === t.STRING_OBJ ? '"' + r.length + r.value + '"' : r.exprType === t.BINARY ? this._makeVarBinary(r) : r.value, 
        this.output += ";\n";
    },
    makeVarExpr: function(e) {
        if (e.type === Variable.Type.VOID) return console.warn("[Compiler.makeVar]:", 'Variable "' + e.name + '" is discarded - void type.'), 
        "";
        var t = Expression.Type, r = e.name + " = ", s = e.expr;
        return s.exprType === t.NUMBER ? r += s.value + ";\n" : s.exprType === t.VAR ? r += s.value + ";\n" : s.exprType === t.STRING_OBJ ? r += '"' + s.value + '";\n' : s.exprType === t.BINARY && (r += this._makeVarBinary(s) + ";\n"), 
        r;
    },
    _makeVarBinary: function(e) {
        var t;
        t = e.lhs.exprType === Expression.Type.BINARY ? this._makeVarBinary(e.lhs) : e.lhs.type === Variable.Type.STRING_OBJ ? '"' + e.lhs.str + '"' : e.lhs.value;
        var r;
        return r = e.rhs.exprType === Expression.Type.BINARY ? this._makeVarBinary(e.rhs) : e.rhs.type === Variable.Type.STRING ? '"' + e.rhs.str + '"' : e.rhs.value, 
        t + " " + e.op + " " + r;
    },
    makeFuncCall: function(e) {
        var t = e.func.params, r = e.args, s = e.func.numParams;
        if (this.output += this.tabs + e.func.name + "(", s > 0) {
            var i = r[0], n = t[0];
            this.output += i === n ? n.var.defaultValue() : i.castTo(n);
            for (var p = 1; s > p; p++) this.output += ", ", i = r[p], n = t[p], this.output += i === n ? n.var.defaultValue() : i.castTo(n);
        }
        this.output += ");\n";
    },
    incTabs: function() {
        this.tabs += "	";
    },
    decTabs: function() {
        this.tabs = this.tabs.substr(0, this.tabs.length - 1);
    }
};