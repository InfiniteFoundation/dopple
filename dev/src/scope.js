"use strict";

dopple.Scope = function(parent) 
{
	this.parent = parent || null;
	this.vars = {};
	this.staticVars = {};
	this.body = [];
	this.bodyFuncs = [];
	this.bodyCls = [];
};

dopple.Scope.prototype = 
{
	createVirtual: function() 
	{
		var scope;

		if(this.virtual) {
			scope = new dopple.Scope(this.parent);
		}
		else {
			scope = new dopple.Scope(this);
		}

		scope.vars = this.vars;
		scope.virtual = true;
		return scope;
	},

	//
	virtual: false,
	funcs: null
};
