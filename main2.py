print('helloworld')
a=int(input())
for i in range(0,a):
    str=input()
    arr=map(int,str.split())
    str2=input()
    fre=[1*arr[1]]*6
    for j in str:
        if fre[ord('A')-ord('J')]!=0:
            fre[ord('A')-ord('J')]-=1
    print(sum(fre))