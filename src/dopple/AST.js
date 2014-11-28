"use strict";

var AST = {};

/* Expression Basic */
AST.Basic = dopple.Class.extend
({
	analyse: function() { return true; },

	to: function(type) {
		return "void";
	},

	strType: function()
	{
		for(var key in this.varEnum) 
		{
			if(this.varEnum[key] === this.type) {
				return key;
			}
		}

		return "";
	},

	strExprType: function()
	{
		for(var key in this.exprEnum) 
		{
			if(this.exprEnum[key] === this.exprType) {
				return key;
			}
		}

		return "";
	},

	//
	type: 0,
	exprType: 0,
	empty: false,
	resolved: false,
	numUses: 0,

	exprEnum: dopple.ExprEnum,
	varEnum: dopple.VarEnum
});

/* Expression Number */
AST.Number = AST.Basic.extend
({
	init: function(value) {
		this.value = value;
	},

	castTo: function(param)
	{
		if(this.type === param.type) {
			return this.value;
		}
		else 
		{
			if(param.type === this.varEnum.NAME) {
				return "\"" + this.value + "\"";
			}
			else if(param.type === this.varEnum.STRING) {
				return "\"" + param.var.hexLength(this.value) + "\"\"" + this.value + "\"";
			}
			else {
				dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, this);
			}		
		}
	},

	defaultValue: function() {
		return "NaN";
	},	

	//
	value: 0,
	type: dopple.VarEnum.NUMBER,
	exprType: dopple.ExprEnum.NUMBER
});

/* Expression String */
AST.String = AST.Basic.extend
({
	init: function(str) 
	{
		if(str) {
			this.value = str;
			this.length = str.length;
		}
	},

	castTo: function(param)
	{
		if(this.type === param.type) {
			return "\"" + this.createHex() + "\"\"" + this.value + "\"";
		}
		else 
		{
			if(param.type === this.varEnum.NUMBER) {
				var num = Number(this.value) || -1;
				return num;
			}		
			if(param.type === this.varEnum.NAME) {
				return "\"" + this.value + "\"";
			}
			else 
			{
				dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, 
					"\"" + param.name + "\" from " + this.strType() + " to " + param.strType());
			}		
		}
	},

	defaultValue: function() {
		return "\"\\x9\\x0\\x0\\x0\"\"undefined\"";
	},

	createHex: function() {
		return ToHex(this.length) + "\\x0\\x0\\x0";
	},	

	set value(str) {
		this._value = str;
		this.length = str.length;
	},

	get value() { return this._value; },

	//
	type: dopple.VarEnum.STRING,
	exprType: dopple.ExprEnum.STRING,

	_value: "",
	length: 0
});

/* Expression Bool */
AST.Bool = AST.Basic.extend
({
	init: function(value) {
		this.value = value * 1;
	},

	castTo: function(param)
	{
		if(this.type === param.type) {
			return this.value;
		}
		else 
		{
			if(param.type === this.varEnum.NAME) {
				return "\"" + this.value + "\"";
			}
			else if(param.type === this.varEnum.STRING) {
				return "\"" + param.var.hexLength(this.value) + "\"\"" + this.value + "\"";
			}
			else {
				dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, this);
			}		
		}
	},	

	str: function() 
	{
		if(typeof this.value === "string") {
			return this.value;
		}

		if(this.value > 0) {
			return "true"
		}
		
		return "false";
	},

	//
	type: dopple.VarEnum.BOOL,
	exprType: dopple.ExprEnum.BOOL,
	value: 0
});

/* Expression Var */
AST.Var = AST.Basic.extend
({
	init: function(name, parentList, type)  
	{
		if(name) { this.value = name; }
		this.parentList = parentList || null;
		this.type = type || 0;
	},

	castTo: function(param)
	{
		if(this.type === param.type) {
			return this.value;
		}
		else 
		{
			if(param.type === this.varEnum.NAME) 
			{
				if(this.type === this.varEnum.STRING) {
					return this.value + " + sizeof(int32_t)";
				}
				else {
					return this.value;				
				}
			}
			else 
			{
				dopple.throw(dopple.Error.INVALID_TYPE_CONVERSION, 
					"\"" + param.name + "\" from " + this.strType() + " to " + param.strType());
			}		
		}
	},

	defaultValue: function() 
	{
		if(this.type === 0 || this.type === this.varEnum.NUMBER) {
			return "NaN";
		}
		else if(this.type === this.varEnum.NAME) {
			return "\"undefined\"";
		}
		else if(this.type === this.varEnum.STRING) {
			return "\"\\x9\\x0\\x0\\x0\"\"undefined\"";
		}
		else {
			throw "AST.Var.defaultValue: Invalid conversion.";
		}
	},

	analyse: function()
	{	
		if(!this.expr) { return true; }
		
		var type = this.expr.exprType;
		if(type === this.exprEnum.BINARY) {
			this.type = this.expr.analyse();
		}
		else if(type === this.exprEnum.FUNCTION) {
			this.type = this.varEnum.FUNCTION_PTR;
		}
		else
		{
			if(this.type !== 0 && this.type !== this.expr.type) 
			{
				console.error("INVALID_TYPE_CONVERSION: Can't convert a variable " + this.var.name + ":" + 
					this.var.strType() + " to " + this.expr.strType());
				return false;
			}
			
			this.type = this.expr.type;
		}

		return true;
	},	

	//
	exprType: dopple.ExprEnum.VAR,

	fullName: "",
	parentList: null,

	var: null,
	expr: null,
	value: "unknown"
});

/* Expression Binary */
AST.Binary = AST.Basic.extend
({
	init: function(op, lhs, rhs) {
		this.op = op;
		this.lhs = lhs;
		this.rhs = rhs;		
	},

	analyse: function()
	{
		var lhsType, rhsType;

		if(this.lhs.exprType === this.exprEnum.BINARY) {
			lhsType = this.lhs.analyse();
		}
		else {
			lhsType = this.lhs.type;
		}

		if(this.rhs.exprType === this.exprEnum.BINARY) {
			rhsType = this.rhs.analyse();
		}
		else {
			rhsType = this.rhs.type;
		}

		if(lhsType === rhsType) 
		{
			if(this.lhs.type === this.varEnum.BOOL && this.rhs.type === this.varEnum.BOOL) {
				this.type = this.varEnum.NUMBER;
			}
			else {
				this.type = lhsType;
			}

			return this.type;
		}

		if(lhsType === this.varEnum.STRING || rhsType === this.varEnum.STRING) {
			this.type = this.varEnum.STRING;
			return this.varEnum.STRING;
		}

		Error.throw(Error.Type.INVALID_TYPE_CONVERSION, this.lhs.strType() + " to " + this.rhs.strType());		

		return 0;
	},	

	//
	exprType: dopple.ExprEnum.BINARY,

	op: "",
	lhs: null,
	rhs: null
});

/* Expression Function */
AST.Function = AST.Basic.extend
({
	init: function(name, scope, params, parentList) 
	{
		this.name = name;
		this.scope = scope;
		this.params = params;
		this.numParams = (params) ? params.length : 0;
		this.parentList = parentList || null;
		this.returnBuffer = [];
	},

	//
	type: dopple.VarEnum.FUNCTION,
	exprType: dopple.ExprEnum.FUNCTION,

	name: "",
	rootName: null,
	returnBuffer: null
});

/* Expression Function Call */
AST.FunctionCall = AST.Basic.extend
({
	init: function(func, args) {
		this.func = func;
		if(args) { this.args = args; }
	},

	//
	exprType: dopple.ExprEnum.FUNCTION_CALL,

	func: null,
	args: null
});

/* Expression Function Call */
AST.Return = AST.Basic.extend
({
	init: function(expr) {
		this.expr = expr;
	},

	//
	exprType: dopple.ExprEnum.RETURN,
	expr: null
});

/* Expression Name */
AST.Name = AST.Basic.extend
({
	init: function(str) {
		this.value = str || "";
	},

	defaultValue: function() {
		return "\"undefined\"";
	},

	//
	type: dopple.VarEnum.NAME,
	exprType: dopple.ExprEnum.NAME
});

/* Expression Format */
AST.Format = AST.Basic.extend
({
	init: function(name) {
		this.name = name;
	},

	defaultValue: function() {
		return '"\\n"';
	},

	//
	type: dopple.VarEnum.FORMAT,
	exprType: dopple.ExprEnum.FORMAT
});

/* Expression Class */
AST.Class = AST.Basic.extend
({
	init: function(name, scope) 
	{
		this.name = name;
		this.scope = scope;

		var scope = new dopple.Scope(scope);
		this.constructFunc = new AST.Function(name, scope, []);			
	},

	//
	type: dopple.VarEnum.Class,
	exprEnum: dopple.ExprEnum.Class,

	name: "",
	str: "[object Object]",
	scope: null,
	isStatic: true,

	constructFunc: null
});
