#pragma once

#include <stdio.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdlib.h>
#include <math.h>
#include <float.h>
#include <string.h>
#include <time.h>

typedef int8_t int8;
typedef int16_t int16;
typedef int32_t int32;
typedef float real32;
typedef double real64;

namespace dopple
{
	const int32 STR_HEADER_SIZE = 4;
}

struct
{
	void log(const char *format, ...)
	{
		va_list argptr;
		va_start(argptr, format);
		vfprintf(stderr, format, argptr);
		va_end(argptr);
	}
	
	void warn(const char *format, ...)
	{
		va_list argptr;
		va_start(argptr, format);
		vfprintf(stderr, format, argptr);
		va_end(argptr);
	}
	
	void error(const char *format, ...)
	{
		va_list argptr;
		va_start(argptr, format);
		vfprintf(stderr, format, argptr);
		va_end(argptr);
	}
} console;

struct
{
	double abs(double num) {
		return ::abs((int)num);
	}
	
	double random() {
		return ((double)rand() / (RAND_MAX));
	}
	
	double sin(double num) {
		return ::sin(num);
	}
	
	double cos(double num) {
		return ::cos(num);
	}
	
	double PI = 3.141592653589793;
} Math;


template <class T>
struct Array {
	Array() {
		
	}
	
	Array(T *buffer) {
		this->buffer= buffer;
	}
	
	double push(T *element) {
		return this->length;
	}
	
	T *pop() {
		return nullptr;
	}
	
	T *shift() {
		return nullptr;
	}
	
	inline void __set__length(double length) {
		
	}
	
	inline void __get__length(double) { return this->length; }
	
	T *buffer = nullptr;
};

#include "dopple_dom.h"
