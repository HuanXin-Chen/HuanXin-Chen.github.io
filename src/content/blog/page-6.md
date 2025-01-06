---
title: 图解四种背包问题及其优化方式
description: 讲解四种背包问题及其优化方式，希望对你有帮助！
pubDatetime: 2023-01-01
published: true
ogImage: ../../assets/6.png
language: cn
tags:
  - 基础知识
---
# 导读
本文将讲解四种背包问题及其优化方式，希望对你有帮助！ ^_^
<a name="ntxmW"></a>
# 背包分类
每 件/种 物品体积Vi<br />不超过背包容量的总价值最大化W（不一定装满）

- 01 背包：每件物品最多只用一次
- 完全背包：每件物品无限个
- 多重背包：每件物品有限ai个
- 分组背包：从每组选择一个
<a name="zNJqj"></a>
# 01背包与动态规划思路
![01动态规划.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/55f6d5ef00a5447eb8c85d00862d9985~tplv-k3u1fbpfcp-zoom-1.image)
<a name="OMhEV"></a>
## 代码实现（二维朴素法）
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8c5cdd4d5df44231baea1da26cb1d418~tplv-k3u1fbpfcp-zoom-1.image)
```cpp
#include<iostream>
#include<algorithm>
using namespace std;

const int N = 1010;

int n,m;
int v[N],w[N];//默认初始为0
int dp[N][N];

int main() {
	
	cin >> n >> m;
	for (int i = 1; i <=n; i++) cin >> v[i] >> w[i];

	for(int i = 1; i <=n; i++) 
		for(int j = 0; j <=m; j++) {
			dp[i][j] = dp[i-1][j];
			if(j>=v[i]) dp[i][j] = max(dp[i][j],dp[i-1][j-v[i]] + w[i]);
		}
	cout<<dp[n][m]<<endl;
	return 0;
}
```
<a name="kV8aE"></a>
## 代码实现（滚动数组，状态压缩）

![Snipaste_2022-12-24_22-43-42.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dd85f36e1eb44a51a5a5b028bf8610f0~tplv-k3u1fbpfcp-zoom-1.image)
```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 1010;

int n,m;
int v[N],w[N];
int dp[N];

int main() {
	cin>>n>>m;
	for (int i = 1; i <= n; i++) cin>>v[i]>>w[i];
	
	for(int i = 1; i <= n; i++)
	    for(int j = m; j >= v[i]; j--) {
	    	//这里空集部分判断直接挪到循环里面
	    	//不用推导，直接继承上一层
	    	dp[j] = max(dp[j],dp[j-v[i]]+w[i]);
		}
	cout<<dp[m]<<endl;
	return 0;
}

```
<a name="GMyKu"></a>
# 完全背包与数列推导优化
<a name="hZbez"></a>
## 最朴素的思路起点
![Snipaste_2022-12-25_10-58-43.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fd52175f504a425ea83adb7d7ff1a1ee~tplv-k3u1fbpfcp-zoom-1.image)
<a name="V8S11"></a>
### 代码实现（显然会超时，1000三次方过亿次了，C++的 1s 大体运行一亿次）
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d7ee8e1349714a2fa00855b7d6708615~tplv-k3u1fbpfcp-zoom-1.image)
```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 1010;

int n,m;
int v[N],w[N];
int f[N][N];

int main() {
    cin >> n >> m;
    for(int i = 1; i <= n; i++) cin >> v[i] >> w[i];
    
    for(int i = 1; i <= n; i++) 
       for(int j = 0; j<= m; j++) 
          for(int k = 0; k*v[i] <= j; k++)
              f[i][j] = max(f[i][j],f[i-1][j-k*v[i]]+k*w[i]);
    cout << f[n][m]<<endl;
    return 0;
}
```
<a name="crtBD"></a>
## DP常见的数列推导优化
推导递推公式，常减去一项来观察规律实现降维。<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1987e3aed3584372ad27bcd6bf5e9cc8~tplv-k3u1fbpfcp-zoom-1.image)
```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 1010;

int n,m;
int v[N],w[N];
int f[N][N];

int main() {
    cin >> n >> m;
    for(int i = 1; i <= n; i++) cin >> v[i] >> w[i];
    
    for(int i = 1; i <= n; i++) 
       for(int j = 0; j<= m; j++) {
           f[i][j] = f[i-1][j];
           if(j >= v[i]) f[i][j] = max(f[i][j],f[i][j-v[i]]+w[i]);
       }
           
    cout << f[n][m]<<endl;
    return 0;
}
```
<a name="ycJrV"></a>
## 状态压缩
区分 01背包(全上层) 和 完全背包(本层+上层) 的遍历顺序。<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/278fe3d95ec24bf6b1264325965193aa~tplv-k3u1fbpfcp-zoom-1.image)

```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 1010;

int n,m;
int v[N],w[N];
int f[N];

int main() {
    cin >> n >> m;
    for(int i = 1; i <= n; i++) cin >> v[i] >> w[i];
    
    for(int i = 1; i <= n; i++) 
       for(int j = v[i]; j<= m; j++) {
           f[j] = max(f[j],f[j-v[i]]+w[i]);
       }
           
    cout << f[m]<<endl;
    return 0;
}
```

<a name="uMRIy"></a>
# 多重背包与二进制枚举优化
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a14cf81bb703428fb68eec7cb05c943d~tplv-k3u1fbpfcp-zoom-1.image)
<a name="wDFe5"></a>
## 最朴素的思路起点（如果数据过大和完全背包一样超时）
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7aa57055c96b4b97bd6dd8b6570b1499~tplv-k3u1fbpfcp-zoom-1.image)

```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 110;

int n,m;
int v[N],w[N],s[N];
int f[N][N];

int main() {
    cin >> n >> m;
    for(int i = 1; i <= n; i++) cin >> v[i] >> w[i] >> s[i];
    
    for(int i = 1; i <= n; i++)
       for(int j = 0; j <= m; j++) 
          for(int k = 0; k*v[i] <= j && k <= s[i]; k++) {
              f[i][j] = max(f[i][j],f[i-1][j-k*v[i]]+k*w[i]);
          }
    cout << f[n][m]<<endl;
    return 0;
}
```
<a name="QdGAR"></a>
## 二进制枚举优化
比如要枚举0->1023中所有的数能不能凑成其中任意一个数<br />我们平常的枚举方法就是：0,1,2,3,4,5,…,1023。这样枚举1024次<br />使用二进制枚举优化，就可以只需枚举10次就可以枚举出任意一个数。<br />将0 ~ 1023这1024个数分为10个组，<br />每组分别是：1 2 4 8 16 32 64 128 256 512 这10个数字(2^0 2^1 2^2 … 2^9)。<br />在枚举的时候只枚举这10个数字，选或不选。就可以枚举出0~1023中的任意一个数字<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b110be8c70994b758d2b6c158cb47f1e~tplv-k3u1fbpfcp-zoom-1.image)<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/639f7455b67449dbb9b21e236a7c5746~tplv-k3u1fbpfcp-zoom-1.image)<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b92b7539b5a2411ea875b31310bb9a99~tplv-k3u1fbpfcp-zoom-1.image)
<a name="Mz0NZ"></a>
### 二进制枚举优化代码实现
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/271193ad86aa452eaf1245e176951bc9~tplv-k3u1fbpfcp-zoom-1.image)

```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 25000;

int n,m;
int v[N],w[N];
int f[N];

int main() {
    cin >> n >> m;
    int cnt = 0;
    for (int i = 1; i <= n; i++) {
        int a,b,s;
        cin >> a >> b >> s;
        int k = 1;
        while(k <= s) {
            cnt++;
            v[cnt] = a*k;
            w[cnt] = b*k;
            s -= k;
            k *= 2;
        }
        if(s > 0) {
            cnt++;
            v[cnt] = a*s;
            w[cnt] = b*s;
        }
    }
    n = cnt;
    for(int i = 1; i <= n; i++) 
       for(int j = m; j >= v[i]; j--)
          f[j] = max(f[j],f[j-v[i]] + w[i]);
          
    cout << f[m] << endl;
    return 0;
}
```
<a name="Dpq8Q"></a>
# 分组背包与状态压缩总结
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9678e2c1b4114628b143d379d8cb9937~tplv-k3u1fbpfcp-zoom-1.image)
<a name="BbChf"></a>
## 和01背包特别像，不过多一个组内选择
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a3c8c8d7dc8a46c989bc674347382b20~tplv-k3u1fbpfcp-zoom-1.image)
<a name="uVtus"></a>
### 状态压缩以及遍历顺序的总结
只要是上一层推导的，则从后往前<br />如果是同层推导的，则从前往后<br />只要是由上层某个方向定向推来的，就可以进行状态压缩
<a name="br9iy"></a>
### 代码实现
```cpp
#include<iostream>
#include<algorithm>

using namespace std;

const int N = 110;

int v[N][N],w[N][N],s[N];
int f[N];
int n,m;

int main() {
    cin >> n >> m;
    for(int i = 1; i <= n; i++) {
        cin >> s[i];
        for(int j = 1; j<= s[i]; j++) {
            cin >> v[i][j] >> w[i][j];
        }
    }
    
    for(int i = 1; i <= n; i++) 
       for(int j = m; j >= 0; j--)
           for(int k = 1; k <= s[i]; k++)
              if(j >= v[i][k]) f[j] = max(f[j],f[j-v[i][k]]+w[i][k]);
    cout << f[m] << endl;
    return 0;
}
```
## 谢谢你的观看!^_^
