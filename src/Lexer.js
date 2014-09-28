"use strict";

function Lexer()
{
	this.tokenizer = new Tokenizer();
	this.token = null;
	this.prevToken = null;

	this.optimizer = new Optimizer();

	this.precedence = {
		"=": 2,
		"<": 100,
		">": 100,
		"+": 200,
		"-": 200,
		"*": 400,
		"/": 400
	};

	this.global = new dopple.Scope();
	this.scope = this.global;

	this.genID = 0;
	this.currName = "";
	this.parentList = null;

	this._skipNextToken = false;

	this.tokenEnum = Token.Type;
	this.varEnum = Variable.Type;
	this.exprEnum = Expression.Type;
};

Lexer.prototype = 
{
	read: function(buffer) 
	{
//		try {
			this.tokenizer.setBuffer(buffer);
			this.parseBody();
		// }
		// catch(str) {
		// 	console.error(str);
		// 	return false;
		// }

		return true;
	},

	nextToken: function() {
		this.token = this.tokenizer.nextToken();
	},

	getTokenPrecendence: function()
	{
		if(this.token.type !== Token.Type.BINOP) {
			return -1;
		}

		var precendence = this.precedence[this.token.str];
		if(precendence === void(0)) {
			return -1;
		}

		return precendence;
	},


	parseBody: function()
	{
		var type;
		var tokenType = Token.Type;

		do
		{
			if(!this._skipNextToken) {
				this.nextToken();
			}
			else {
				this._skipNextToken = false;
			}

			type = this.token.type;
			if(type === tokenType.NAME || 
			   type === tokenType.VAR) 
			{
				this.parseVar();
			}
			else if(type === tokenType.FUNCTION) {
				this.parseFunction();
			}
			else if(type === tokenType.RETURN) {
				this.parseReturn();
			}
		} while(this.token.type !== tokenType.EOF && this.token.str !== "}");
	},

	parseExpression: function()
	{
		var lhs = this.parsePrimary();
		if(!lhs) {
			return null;
		}

		return this.parseBinOpRHS(0, lhs);
	},

	parseBinOpRHS: function(exprPrecedence, lhs)
	{
		for(;;)
		{
			var precendence = this.getTokenPrecendence();
			if(precendence < exprPrecedence) {
				return lhs;
			}

			var binop = this.token.str;
			this.nextToken();

			var rhs = this.parsePrimary();
			if(!rhs) {
				return null;
			}

			var nextPrecedence = this.getTokenPrecendence();
			if(precendence < nextPrecedence) 
			{
				rhs = this.parseBinOpRHS(precendence + 1, rhs);
				if(!rhs) {
					return null;
				}
			}

			lhs = new Expression.Binary(binop, lhs, rhs);
		}

		return lhs;
	},

	parsePrimary: function()
	{
		if(this.token.type === Token.Type.NUMBER) {
			return this.parseNumber();
		}
		else if(this.token.type === Token.Type.NAME) {
			return this.parseName();
		}
		else if(this.token.type === Token.Type.STRING) {
			return this.parseString();
		}		
		else if(this.token.type === Token.Type.BOOL) {
			return this.parseBool();
		}
		else if(this.token.type === Token.Type.FUNCTION) {
			return this.parseFunction();
		}
		else if(this.token.str === "{") {
			return this.parseObject();
		}
			
		this.handleTokenError();
	},

	parseNumber: function() 
	{
		var expr = new Expression.Number(this.token.value);
		this.nextToken();
		return expr;
	},

	parseBool: function()
	{
		var expr = new Expression.Bool(this.token.value);
		this.nextToken();
		return expr;
	},

	parseName: function()
	{
		var variable = this.scope.vars[this.token.str];
		if(!variable) {
			dopple.throw(dopple.Error.REFERENCE_ERROR, this.token.str);
		}

		var expr = new Expression.Var(this.token.str);
		expr.expr = expr;
		expr.var = variable;
		expr.type = variable.type;
		expr.value = this.token.str;
		this.nextToken();
		return expr;
	},

	parseString: function()
	{
		var expr = new Expression.StringObj(this.token.str);
		this.nextToken();
		return expr;
	},	

	parseVar: function()
	{
		var initial = false;
		if(this.token.type === Token.Type.VAR)
		{
			this.nextToken();	
			if(this.token.type !== Token.Type.NAME) {
				this.handleTokenError();
			}

			initial = true;
		}

		this.currName = this.token.str;
		this.nextToken();

		if(this.token.str === "(") {
			this.parseFuncCall(this.currName);
		}
		else if(this.token.str === ".") 
		{
			// Invalid if initialized as: var <objName>.<memberName>
			if(initial) {
				dopple.throw(dopple.Error.UNEXPECTED_TOKEN, this.token.str);
			}

			this._defineObjectVar();
		}
		else
		{	
			if(this.token.str === "=")
			{
				this.nextToken();

				var expr = this.parseExpression();
				if(expr.exprType !== this.exprEnum.OBJECT) {
					this._defineVar(expr, initial);			
				}
			}
			else 
			{
				if(!initial && this.token.type === this.tokenEnum.NAME) {
					this.handleTokenError();
				}
				else if(initial && this.token.type === this.tokenEnum.SYMBOL) {
					this.handleUnexpectedToken();
				}

				this._defineVar(null, initial);
			}
		}
	},	

	_defineVar: function(expr, initial)
	{
		// Ignore if it's not a definition and without a body.
		if(!expr && !initial) {
			this.getExprFromVar(this.scope, this.currName);
			return;
		}

		var varExpr = new Expression.Var(this.currName, this.parentList);
		var scopeVarExpr = this.scope.vars[this.currName];
		var definition = false;

		// Expression is function:
		if(expr && expr.exprType === this.exprEnum.FUNCTION)
		{
			if(scopeVarExpr) {
				dopple.throw(dopple.Error.UNSUPPORTED_FEATURE, "Redefining function pointer");
			}


		}
		//
		else
		{
			if(scopeVarExpr === void(0)) 
			{
				// No such variable defined.
				if(!initial) {
					dopple.throw(dopple.Error.REFERENCE_ERROR, this.currName);
				}

				definition = true;
				scopeVarExpr = varExpr;
				this.scope.vars[this.currName] = varExpr;
				this.scope.defBuffer.push(varExpr);
			}
			else {
				this.scope.varBuffer.push(varExpr);
			}

			varExpr.var = scopeVarExpr;
		}

		if(expr)
		{
			expr = this.optimizer.do(expr);
			varExpr.expr = expr;
			varExpr.analyse();

			if(definition && this.scope === this.global)
			{
				var exprType = varExpr.expr.exprType;
				if(exprType === this.exprEnum.BINARY || exprType === this.exprEnum.VAR) {
					this.scope.varBuffer.push(varExpr);
				}
			}

			if(this.token.str !== ";") {
				this._skipNextToken = true;
			}	
		}			
	},

	_defineObjectVar: function()
	{
		var objExpr = this.getExprFromVar(this.scope, this.currName);

		this.nextToken();
		if(this.token.type !== this.tokenEnum.NAME) {
			this.handleTokenError();
		}

		this.currName = this.token.str;
		var parentList = [ objExpr ];
		var memberExpr = objExpr.scope.vars[this.currName];

		this.nextToken();
		if(this.token.str !== "=") {
			return;
		}

		this.nextToken();		

		// If object don't have such variable - add as a definiton:
		if(!memberExpr) 
		{
			memberExpr = new Expression.Var(this.currName, parentList);
			memberExpr.var = memberExpr;

			objExpr.scope.vars[this.currName] = memberExpr;
			objExpr.scope.defBuffer.push(memberExpr);

			var varExpr = new Expression.Var(this.currName, parentList);
			varExpr.expr = this.parseExpression();
			varExpr.expr = this.optimizer.do(varExpr.expr);
			varExpr.var = memberExpr;
			varExpr.analyse();

			this.scope.varBuffer.push(varExpr);

			memberExpr.type = varExpr.type;
		}
		else
		{	
			var varExpr = new Expression.Var(this.currName, parentList);
			varExpr.expr = this.parseExpression();
			varExpr.expr = this.optimizer.do(varExpr.expr);
			varExpr.var = memberExpr;
			varExpr.analyse();

			this.scope.vars[this.currName] = varExpr;
			this.scope.varBuffer.push(varExpr);	
		}	
	},

	parseObject: function()
	{
		var name = "";
		if(this.scope === this.global) {
			name = this.currName;
		}
		else {
			name = "__Sanonym" + this.genID++ + "__";
		}

		if(this.scope.vars[name]) {
			dopple.throw(dopple.Error.REDEFINITION, name);
		}

		var parentScope = this.scope;
		this.scope = new dopple.Scope(this.scope);
		var objExpr = new Expression.Object(name, this.scope);

		this.parentList = [ objExpr ];

		// Parse object members:
		var varName, varExpr, expr;
		this.nextToken();
		while(this.token.str !== "}") 
		{
			if(this.token.type === this.tokenEnum.NAME ||
			   this.token.type === this.tokenEnum.STRING) 
			{
				varName = this.token.str;

				this.nextToken();
				if(this.token.str !== ":") {
					this.handleTokenError();
				}

				this.nextToken();
				expr = this.parseExpression();
				expr = this.optimizer.do(expr);
				if(expr.exprType === this.exprEnum.OBJECT) {
					dopple.throw(dopple.Error.UNSUPPORTED_FEATURE, "object inside object")
				}

				if(this.token.str !== "," && this.token.str !== "}") {
					this.handleTokenError();
				}

				if(this.token.str !== "}")
				{
					if(this.token.str !== ",") 
					{
						this.validateToken();
						this.nextToken();
						if(this.token.str !== "}") {
							this.handleTokenError();
						}
					}
					else {
						this.nextToken();
					}					
				}
		
				varExpr = new Expression.Var(varName, this.parentList);
				varExpr.expr = expr;
				varExpr.analyse();

				this.scope.vars[varName] = varExpr;
				this.scope.defBuffer.push(varExpr);
				this.scope.varBuffer.push(varExpr);
			}
			else {
				dopple.throw(dopple.Error.UNSUPPORTED_FEATURE, "hashmap");
			}
		}

		parentScope.vars[name] = objExpr;
		parentScope.defBuffer.push(objExpr);

		// Constructor:
		var funcName = this.currName + "$__init";
		var initFunc = new Expression.Function(funcName, this.scope, null);
		this.scope.vars[funcName] = initFunc;
		parentScope.defBuffer.push(initFunc);

		var initFuncCall = new Expression.FunctionCall(initFunc);
		parentScope.varBuffer.push(initFuncCall);

		this.nextToken();
		this.scope = parentScope;
		this._skipNextToken = true;
		this.parentList = null;

		return objExpr;
	},

	parseFunction: function()
	{
		this.nextToken();
		var name = this.token.str;

		this.nextToken();
		if(this.token.str !== "(") {
			throw "Error: not (";
		}

		// Create a new scope.
		this.scope = new dopple.Scope(this.scope);	

		// Parse all variables.
		var newVar;
		var vars = [];
		this.nextToken();
		while(this.token.type === Token.Type.NAME) 
		{
			newVar = new Expression.Var(this.token.str);
			newVar.var = newVar;
			vars.push(newVar);
			this.scope.vars[newVar.name] = newVar;
			
			this.nextToken();
			if(this.token.str !== ",") 
			{
				if(this.token.str === ")") {
					break;
				}

				throw "Error: not ,";
			}

			this.nextToken();
		}

		if(this.token.str !== ")") {
			throw "Error: not )";
		}		

		this.nextToken();
		if(this.token.str !== "{") {
			dopple.throw(dopple.Error.UNEXPECTED_EOI);
		}		
		
		this.parseBody();
		
		if(this.token.str !== "}") {
			dopple.throw(dopple.Error.UNEXPECTED_EOI);
		}

		var funcExpr = new Expression.Function(name, this.scope, vars);
		var parentScope = this.scope.parent;
		parentScope.vars[name] = funcExpr;
		parentScope.defBuffer.push(funcExpr);

		this.scope = this.scope.parent;

		this.nextToken();
		this._skipNextToken = true;

		return funcExpr;
	},	

	parseFuncCall: function(name)
	{
		var func = this.scope.vars[name];
		if(!func) {
			dopple.throw(dopple.Error.REFERENCE_ERROR, name);
		}

		var i = 0
		var args = new Array(func.numParams);
		var param, expr;
		var funcParams = func.params;
		var numFuncParams = funcParams.length;

		// Check if there are arguments passed:
		this.nextToken();
		if(this.token.str !== ")") 
		{
			// Parse all variable expressions:	
			for(;; i++)
			{
				// Too many arguments:
				if(i >= numFuncParams) {
					dopple.throw(dopple.Error.TOO_MANY_ARGUMENTS);
				}

				expr = this.parseExpression();
				expr = this.optimizer.do(expr);
				expr.analyse();
				args[i] = expr;

				param = funcParams[i];
				if(param.type === 0) {
					param.type = expr.type;
				}
		
				if(this.token.str !== ",") {
					i++;
					break;
				}
				this.nextToken();		
			}
		}

		// Add missing variables with default value:
		for(; i < numFuncParams; i++) {
			args[i] = funcParams[i];				
		}		

		var funcCall = new Expression.FunctionCall(func, args);
		this.scope.varBuffer.push(funcCall);
	},

	parseReturn: function()
	{
		var expr = null;
		var tokenType = Token.Type;

		this.nextToken();
		if(this.token.type === tokenType.VAR ||
		   this.token.type === tokenType.NUMBER ||
		   this.token.type === tokenType.STRING)
		{
			var varExpr = new Expression.Var("");
			varExpr.expr = this.parseExpression();
			varExpr.expr = this.optimizer.do(varExpr.expr);
			varExpr.var = varExpr.expr;
			varExpr.analyse();
		}

		var returnExpr = new Expression.Return(varExpr);
		this.scope.varBuffer.push(returnExpr);
	},

	getExprFromVar: function(scope, name) 
	{
		var expr = scope.vars[name];
		if(!expr) {
			dopple.throw(dopple.Error.REFERENCE_ERROR, name);
		}

		return expr;
	},


	externFunc: function(name, params)
	{
		var funcParams = null;

		if(params) 
		{
			funcParams = [];

			var varExpr, expr, type;
			var numParams = params.length;
			for(var i = 0; i < numParams; i += 2) 
			{
				type = params[i];
				if(type === this.varEnum.NUMBER) {
					expr = new Expression.Number(0);
				}
				else if(type === this.varEnum.STRING) {
					expr = new Expression.String("");
				}
				else if(type === this.varEnum.STRING_OBJ) {
					expr = new Expression.StringObj("");
				}

				varExpr = new Expression.Var(params[i + 1]);
				varExpr.type = type;
				varExpr.var = expr;
				funcParams.push(varExpr);
			}
		}

		var func = new Expression.Function(name, this.global, funcParams);
		this.global.vars[name] = func;
	},

	externObj: function(name)
	{
		var objExpr = new Expression.Object(name);
		this.global.vars[name] = objExpr;

		return objExpr;
	},

	validateToken: function()
	{
		if(this.token.type === this.tokenEnum.EOF) {
			dopple.throw(dopple.Error.UNEXPECTED_EOI);
		}
		else if(this.token.type === this.tokenEnum.NUMBER) {
			dopple.throw(dopple.Error.UNEXPECTED_NUMBER);
		}
		else if(this.token.str === "@") {
			dopple.throw(dopple.Error.UNEXPECTED_TOKEN_ILLEGAL);
		}
		else if(this.token.type !== this.tokenEnum.SYMBOL) {
			dopple.throw(dopple.Error.UNEXPECTED_ID);
		}		
	},

	handleTokenError: function() {
		this.validateToken();
		dopple.throw(dopple.Error.UNEXPECTED_TOKEN, this.token.str);		
	},

	handleUnexpectedToken: function() 
	{
		if(isIllegal(this.token.str)) {
			dopple.throw(dopple.Error.UNEXPECTED_TOKEN_ILLEGAL);
		}
		else {
			dopple.throw(dopple.Error.UNEXPECTED_TOKEN, this.token.str);
		}
	}
};

dopple.Scope = function(parent)
{
	this.parent = parent || null;

	this.vars = {};
	this.defBuffer = [];
	this.varBuffer = [];
};
