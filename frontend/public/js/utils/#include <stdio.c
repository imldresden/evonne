#include <stdio.h>
float a = 22;
float b = 7;
float c = 22;
float d = 7;
float e;
double f;
int main(){
    e = a / b;
    f = c / d;
    printf("float is %f ", e);
    printf("double is %f ", f);
    return 0;
}
