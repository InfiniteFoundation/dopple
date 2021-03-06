"use strict";

dopple.acorn = 
{
	prepare: function()
	{
		this.scope = new dopple.Scope();
		this.globalScope = this.scope;

		this.lookup["Literal"] = this.parseLiteral;
		this.lookup["Identifier"] = this.parseIdentifier;
		this.lookup["Property"] = this.parseProperty;
		this.lookup["VariableDeclaration"] = this.parseVar;
		this.lookup["VariableDeclarator"] = this.parseVarDeclr;
		this.lookup["FunctionDeclaration"] = this.parseFunc;
		this.lookup["FunctionExpression"] = this.parseFuncExpr;
		this.lookup["EmptyStatement"] = this.parseEmpty;
		this.lookup["ExpressionStatement"] = this.parseExpr;
		this.lookup["ReturnStatement"] = this.parseReturn;
		this.lookup["BlockStatement"] = this.parseBlock;
		this.lookup["IfStatement"] = this.parseIf;
		this.lookup["SwitchStatement"] = this.parseSwitch;
		this.lookup["ForStatement"] = this.parseFor;
		this.lookup["ForInStatement"] = this.parseForIn;
		this.lookup["WhileStatement"] = this.parseWhile;
		this.lookup["DoWhileStatement"] = this.parseDoWhile;
		this.lookup["ContinueStatement"] = this.parseContinue;
		this.lookup["BreakStatement"] = this.parseBreak;
		this.lookup["LogicalExpression"] = this.parseLogicalExpr;
		this.lookup["AssignmentExpression"] = this.parseAssignExpr;
		this.lookup["UpdateExpression"] = this.parseUpdateExpr;
		this.lookup["SequenceExpression"] = this.parseSequenceExpr;
		this.lookup["BinaryExpression"] = this.parseBinaryExpr;
		this.lookup["ConditionalExpression"] = this.parseConditionalExpr;
		this.lookup["CallExpression"] = this.parseCallExpr;
		this.lookup["ObjectExpression"] = this.parseObjExpr;
		this.lookup["ThisExpression"] = this.parseThisExpr;
		this.lookup["NewExpression"] = this.parseNewExpr;
		this.lookup["MemberExpression"] = this.parseMemberExpr;
		this.lookup["UnaryExpression"] = this.parseUnaryExpr;
		this.lookup["ArrayExpression"] = this.parseArrayExpr;
	},

	parse: function(ast)
	{
		this.prepare();

		this.parseBody(ast.body);

		return this.globalScope;
	},

	parseBody: function(body)
	{
		var numNodes = body.length;
		for(var n = 0; n < numNodes; n++) {
			var node = body[n];
			var expr = this.lookup[node.type].call(this, node);
			this.scope.body.push(expr);
		}
	},

	parseLiteral: function(node)
	{
		if(typeof node.value === "string") {
			return new dopple.AST.String(node.value);
		}
		else 
		{
			if(node.raw === "false") {
				return new dopple.AST.Bool(false);
			}
			else if(node.raw === "true") {
				return new dopple.AST.Bool(true);
			}
			else if(node.raw === "null") {
				return new dopple.AST.Null();
			}

			return new dopple.AST.Number(node.value);
		}
	},	

	parseExpr: function(node) {
		return this.lookup[node.expression.type].call(this, node.expression);
	},	

	parseIdentifier: function(node) {
		return new dopple.AST.String(node.name);
	},	

	parseBinaryExpr: function(node) 
	{
		return new dopple.AST.Binary(
			this.lookup[node.left.type].call(this, node.left), 
			this.lookup[node.right.type].call(this, node.right),
			node.operator);
	},	

	parseAssignExpr: function(node)
	{
		var lhs = this.lookup[node.left.type].call(this, node.left);
		var rhs = this.lookup[node.right.type].call(this, node.right);

		var assignExpr = new dopple.AST.Assign(lhs, rhs, node.operator);
		return assignExpr;
	},

	parseUpdateExpr: function(node)
	{
		var value = this.lookup[node.argument.type].call(this, node.argument);

		var updateNode = new dopple.AST.Update(value, node.operator);
		return updateNode;
	},

	parseConditionalExpr: function(node)
	{
		var condExpr = new dopple.AST.Conditional();
		condExpr.test = this.lookup[node.test.type].call(this, node.test);
		condExpr.value = this.lookup[node.consequent.type].call(this, node.consequent);
		condExpr.valueFail = this.lookup[node.alternate.type].call(this, node.alternate);
		return condExpr;
	},	

	parseLogicalExpr: function(node)
	{
		return new dopple.AST.Logical(
			node.operator, 
			this.lookup[node.left.type].call(this, node.left), 
			this.lookup[node.right.type].call(this, node.right));
	},

	parseUnaryExpr: function(node) {
		var expr = this.lookup[node.argument.type].call(this, node.argument);
		var unaryExpr = new dopple.AST.Unary(expr, node.operator);
		return unaryExpr;
	},	

	parseVar: function(node) 
	{
		var varExpr;
		var decls = node.declarations;
		var num = decls.length;
		for(var n = 0; n < num; n++) {
			varExpr = this.parseVarDecl(decls[n]);
			this.scope.body.push(varExpr);
		}

		return null;
	},	

	parseVarDecl: function(node)
	{
		var name = this.lookup[node.id.type].call(this, node.id);

		var value = null;
		if(node.init) {
			value = this.lookup[node.init.type].call(this, node.init);
		}

		var refExpr = new dopple.AST.Reference(name, value);
		var varExpr = new dopple.AST.Var(refExpr);
		return varExpr;
	},

	parseIf: function(node)
	{
		var prevScope = this.scope;
		var ifExpr = new dopple.AST.If();

		this.scope = prevScope.createVirtual();
		var value = this.lookup[node.test.type].call(this, node.test);
		this.parseBody(node.consequent.body);
		ifExpr.branchIf = new ifExpr.Branch(this.scope, value);

		var altNode = node.alternate;
		while(altNode) 
		{
			this.scope = prevScope.createVirtual();
			
			if(altNode.type === "BlockStatement") {
				this.parseBody(altNode.body);
				ifExpr.branchElse = new ifExpr.Branch(this.scope, null);
			}
			else 
			{
				this.parseBody(altNode.consequent.body);
				value = this.lookup[altNode.test.type].call(this, altNode.test);
				if(!ifExpr.branchElseIf) {
					ifExpr.branchElseIf = [ new ifExpr.Branch(this.scope, value) ];
				}
				else {
					ifExpr.branchElseIf.push(new ifExpr.Branch(this.scope, value));
				}
			}

			altNode = altNode.alternate;
		}

		this.scope = prevScope;

		return ifExpr;
	},	

	parseSwitch: function(node)
	{
		var cases = node.cases;
		var numCases = cases.length;
		var caseExprs = new Array(numCases);
		for(var n = 0; n < numCases; n++) {
			caseExprs[n] = this.parseSwitchCase(cases[n])
		}

		var discriminant = this.lookup[node.discriminant.type].call(this, node.discriminant);

		var switchExpr = new dopple.AST.Switch(discriminant, cases);
		return switchExpr;
	},

	parseSwitchCase: function(node)
	{
		var testExpr;
		if(node.test) {
			testExpr = this.lookup[node.test.type].call(this, node.test);
		}
		else {
			testExpr = null;
		}

		var rootScope = this.scope;
		var bodyScope = rootScope.createVirtual();
		this.scope = bodyScope;
		this.parseBody(node.consequent);
		this.scope = rootScope;

		var caseExpr = new dopple.AST.SwitchCase(testExpr, bodyScope);
		return caseExpr;
	},

	parseFor: function(node)
	{
		var rootScope = this.scope;

		var initScope = null;
		if(node.init) {
			initScope = rootScope.createVirtual();
			this.scope = initScope;
			this.lookup[node.init.type].call(this, node.init);	
		}

		var updateScope = null;
		if(node.update) {
			updateScope = rootScope.createVirtual();
			this.scope = updateScope;
			this.lookup[node.update.type].call(this, node.update);
		}

		var bodyScope = rootScope.createVirtual();
		this.scope = bodyScope;
		this.lookup[node.body.type].call(this, node.body);

		this.scope = rootScope;

		var forExpr = new dopple.AST.For(initScope, updateScope, bodyScope);
		return forExpr;
	},	

	parseForIn: function(node)
	{
		var lhsExpr = this.lookup[node.left.type].call(this, node.left);
		var rhsExpr = this.lookup[node.right.type].call(this, node.right);

		var rootScope = this.scope;
		var bodyScope = rootScope.createVirtual();
		this.scope = bodyScope;
		this.lookup[node.body.type].call(this, node.body);
		this.scope = rootScope;

		var forInExpr = new dopple.AST.ForIn(lhsExpr, rhsExpr, bodyScope);
		return forInExpr;		
	},

	parseWhile: function(node)
	{
		var testExpr = this.lookup[node.test.type].call(this, node.test);

		var rootScope = this.scope;
		var bodyScope = rootScope.createVirtual();
		this.scope = bodyScope;
		this.lookup[node.body.type].call(this, node.body);
		this.scope = rootScope;

		var whileExpr = new dopple.AST.While(testExpr, bodyScope);
		return whileExpr;
	},

	parseDoWhile: function(node)
	{
		var testExpr = this.lookup[node.test.type].call(this, node.test);

		var rootScope = this.scope;
		var bodyScope = rootScope.createVirtual();
		this.scope = bodyScope;
		this.lookup[node.body.type].call(this, node.body);
		this.scope = rootScope;

		var doWhileExpr = new dopple.AST.DoWhile(testExpr, bodyScope);
		return doWhileExpr;
	},

	parseContinue: function(node)
	{
		var continueNode = new dopple.AST.Continue();
		return continueNode;
	},

	parseBreak: function(node)
	{
		var breakNode = new dopple.AST.Break();
		return breakNode;
	},

	parseBlock: function(node) 
	{
		var rootScope = this.scope;

		var blockScope = rootScope.createVirtual();
		this.scope = blockScope;
		this.parseBody(node.body);

		this.scope = rootScope;

		var blockNode = new dopple.AST.Block(blockScope);
		return blockNode;
	},

	parseReturn: function(node) 
	{
		var value = null;
		if(node.argument) {
			value = this.lookup[node.argument.type].call(this, node.argument);
		}

		var returnExpr = new dopple.AST.Return(value);
		return returnExpr;
	},	

	parseFunc: function(node) 
	{
		var scope = new dopple.Scope(this.scope);
		this.scope = scope;
		this.parseBody(node.body.body);

		var name = "";
		if(node.id) {
			name = node.id.name;
		}
		
		var func = new dopple.AST.Function(name, null, scope, this.parseParams(node.params));
		this.scope = this.scope.parent;

		return func;
	},

	parseFuncExpr: function(node) {
		return this.parseFunc(node);
	},

	parseCallExpr: function(node) 
	{
		if(node.callee.type === "MemberExpression" && 
		   node.callee.property.name === "class") 
		{
			var numArgs = node.arguments.length;
			if(numArgs > 3) { return null; }

			var objExpr;
			if(numArgs === 2) {
				objExpr = this.parseObjExpr(node.arguments[1]);
			}
			else 
			{
				if(node.arguments[2].type === "Identifier") { 
					return null; 
				}

				objExpr = this.parseObjExpr(node.arguments[2]);
			}

			var name = this.genName(node.arguments[0].value);
			var clsExpr = new dopple.AST.Class(name, objExpr.scope);
			return clsExpr;
		}
		else
		{
			var nameExpr = this.lookup[node.callee.type].call(this, node.callee);
			var funcCall = new dopple.AST.FunctionCall(nameExpr, this.parseArgs(node.arguments));
			return funcCall;
		}

		return null;
	},	

	parseObjExpr: function(node)
	{
		var objScope = new dopple.Scope(this.scope);

		var propExpr;
		var props = node.properties;
		var num = props.length;
		for(var n = 0; n < num; n++) {
			propExpr = this.parseObjProp(props[n]);
			objScope.body.push(propExpr);
		}

		var objExpr = new dopple.AST.Object(objScope);
		return objExpr;
	},

	parseObjProp: function(node) 
	{
		var keyExpr = this.lookup[node.key.type].call(this, node.key);
		var valueExpr = this.lookup[node.value.type].call(this, node.value);

		var expr;
		if(node.kind === "set") {
			expr = new dopple.AST.Setter(keyExpr, valueExpr);
		}
		else if(node.kind === "get") {
			expr = new dopple.AST.Getter(keyExpr, valueExpr);
		}
		else
		{
			if(keyExpr.exprType === dopple.ExprType.REFERENCE) 
			{		
				expr = new dopple.AST.Reference(keyExpr, valueExpr);
			}
			else {
				expr = new dopple.AST.ObjectProperty(keyExpr, valueExpr);
			}
		}		

		return expr;
	},

	parseThisExpr: function(node)
	{
		var thisNode = new dopple.AST.This();
		return thisNode;
	},

	parseNewExpr: function(node) {
		var nameExpr = this.lookup[node.callee.type].call(this, node.callee);
		var expr = new dopple.AST.New(nameExpr, this.parseArgs(node.arguments));
		return expr;
	},

	parseMemberExpr: function(node) 
	{	
		var right = this.lookup[node.property.type].call(this, node.property);
		var left = this.lookup[node.object.type].call(this, node.object);

		var expr;
		if(node.computed) {
			expr = new dopple.AST.Subscript(left, right);
		}
		else {
			expr = new dopple.AST.Member(left, right);
		}
		
		return expr;
	},	

	parseArrayExpr: function(node)
	{
		var elementNode = null;
		var elements = node.elements;
		var num = elements.length;
		var buffer = (num > 0) ? new Array(num) : null;

		for(var n = 0; n < num; n++) {
			elementNode = elements[n];
			buffer[n] = this.lookup[elementNode.type].call(this, elementNode);
		}

		var arrayExpr = new dopple.AST.Array(buffer);
		return arrayExpr;
	},	

	parseParams: function(paramNodes) 
	{
		var node = null;
		var param = null;
		var num = paramNodes.length;		
		var params = new Array(num);

		for(var n = 0; n < num; n++) {
			node = paramNodes[n];
			param = new dopple.AST.Reference(node.name);
			params[n] = param;
		}

		return params;
	},

	parseArgs: function(argNodes)
	{
		var node = null;
		var arg = null;
		var num = argNodes.length;		
		var args = new Array(num);

		for(var n = 0; n < num; n++) {
			node = argNodes[n];
			arg = this.lookup[node.type].call(this, node);
			args[n] = arg;
		}

		return args;
	},

	genName: function(name)
	{
		var expr;
		var buffer = name.split(".");
		var num = buffer.length;

		if(num === 1) {
			expr = new dopple.AST.String(buffer[0]);
		}
		else 
		{
			num--;
			var valueRef = new dopple.AST.String(buffer[num--]);
			var nameRef = new dopple.AST.String(buffer[num--]);
			expr = new dopple.AST.Member(nameRef, valueRef);

			for(var n = num; n > 0; n--) {
				nameRef = new dopple.AST.String(buffer[num--]);
				expr = new dopple.AST.Member(nameRef, valueRef);
			}
		}

		return expr;
	},

	//
	lookup: [],

	globalScope: null,
	scope: null	
};