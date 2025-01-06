---
title: 你所不知道的负载均衡策略
description: 基于网关和RPC的负载均衡策略思考!
pubDatetime: 2024-07-15
published: true
ogImage: ../../assets/24.png
language: cn
tags:
  - 后端技术
---
## 背景介绍
**LoadBalance（负载均衡）的职责是将网络请求或者其他形式的负载“均摊”到不同的服务节点上，从而避免服务集群中部分节点压力过大、资源紧张，而另一部分节点比较空闲的情况。**<br />通过合理的负载均衡算法，我们希望可以让每个服务节点获取到适合自己处理能力的负载，**实现处理能力和流量的合理分配**。常用的负载均衡可分为**软件负载均衡**（比如，日常工作中使用的 Nginx）和**硬件负载均衡**（主要有 F5、Array、NetScaler 等，不过开发工程师在实践中很少直接接触到）。<br />对于网关来说，需要支持多种负载均衡的方案，包括随机选择、Hash、轮询等方式。**我们的网关中不仅实现了传统网关的这些均衡策略，还通过流量预热(warmup)等细节处理，对服务器节点的加入，做了更平滑的流量处理，获得了更好的整体稳定性。**
### 调用流程
> **处理流程如何？**

网关和RPC框架类似，这里以Dubbo为例子：

- 拿到目录之后，路由判断，最后就会走负载均衡进行调用。

![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721010322278-dacd2ffd-76be-46be-924f-f6ec991c1bbd.png#averageHue=%23faf8f8&clientId=u1e6d4041-b05e-4&from=paste&height=389&id=u73ea0240&originHeight=583&originWidth=1104&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=97681&status=done&style=none&taskId=uc1e635c3-9588-4962-9d35-65881de3c4a&title=&width=736)
### 提供策略
我们的网关，提供了如下的几种策略：

- 基于一致性hash的选择
- 基于权重的随机分配选择
- 基于权重的加权轮询选择
可以说这三者，就是经典的负载均衡策略代表了，背后分别表示着：哈希、随机、轮询
```java
public enum LoadBalanceEnum {
    /**
     * Hash load balance enum.
     */
    HASH(1, "hash", true),

    /**
     * Random load balance enum.
     */
    RANDOM(2, "random", true),

    /**
     * Round robin load balance enum.
     */
    ROUND_ROBIN(3, "roundRobin", true);

    private final int code;
    private final String name;
    private final boolean support;
}
```
## 扩展点抽象与上游定义
### 扩展点SPI
在正式介绍实现之前，需要确定好我们的扩展点抽象，与上游定义。我们的核心接口很简单：负载均衡是在一系列服务器节点中选出最合适的节点，也就是选择策略。
```java
@SPI
public interface LoadBalancer {

    /**
     * this is select one for upstream list.
     *
     * @param upstreamList upstream list
     * @param ip ip
     * @return upstream
     */
    Upstream select(List<Upstream> upstreamList, String ip);
}
```
### 上游定义
接口中，upstreamList是可选路由的一组服务器节点，`Upstream` 是服务器节点的数据结构，它包括的重要元素有：协议、url 、权重、时间戳，warmup，健康状态等。
```java
public class Upstream {
    /**
     * protocol.
     */
    private final String protocol;

    /**
     * url.
     */
    private String url;

    /**
     * weight.
     */
    private final int weight;

    /**
     * false close, true open.
     */
    private boolean status;

    /**
     * startup time.
     */
    private final long timestamp;

    /**
     * warmup.
     */
    private final int warmup;

    /**
     * healthy.
     */
    private boolean healthy;

    /**
     * lastHealthTimestamp.
     */
    private long lastHealthTimestamp;

    /**
     * lastUnhealthyTimestamp.
     */
    private long lastUnhealthyTimestamp;

    /**
     * group.
     */
    private String group;

    /**
     * version.
     */
    private String version;
}

```
到这里，已经基本确定了要处理的一些属性了，这里重点关注这几个属性，后续有所作用：
```java
public class Upstream {
    /**
     * weight.
     */
    private final int weight;

    /**
     * false close, true open.
     */
    private boolean status;

    /**
     * startup time.
     */
    private final long timestamp;

    /**
     * warmup.
     */
    private final int warmup;

    /**
     * healthy.
     */
    private boolean healthy;

    /**
     * lastHealthTimestamp.
     */
    private long lastHealthTimestamp;

    /**
     * lastUnhealthyTimestamp.
     */
    private long lastUnhealthyTimestamp;

}
```
### 模板抽象
为了方便后续的扩展，我们使用模板模式的方法，对抽象类进行了抽象，后续只需扩展相应的逻辑即可：这个抽象类实做了`LoadBalancer`接口, 定义了抽象方法`doSelect()`留给实作类处理，在模板方法`select()` 中先进行校验，之后调用由实作类实现的`doSelect()`方法。
```java
public abstract class AbstractLoadBalancer implements LoadBalancer {
    /**
     * Do select divide upstream.
     *
     * @param upstreamList the upstream list
     * @param ip           the ip
     * @return the divide upstream
     */
    protected abstract Upstream doSelect(List<Upstream> upstreamList, String ip);

    @Override
    public Upstream select(final List<Upstream> upstreamList, final String ip) {
        if (CollectionUtils.isEmpty(upstreamList)) {
            return null;
        }
        if (upstreamList.size() == 1) {
            return upstreamList.get(0);
        }
        return doSelect(upstreamList, ip);
    }
}
```
## 随机选择策略
虽然说，随机选择策略主打一个随机，但是我们给上游的定义中，引入了一个权重值，所以理所当然的，我们也应该在我们随机选择策略中，体现出这个权重的意义：
```java
public class Upstream {
    /**
     * weight.
     */
    private final int weight;
}
```
这里可以处理两种情况：

1. 没有权重：所有服务器都没有设定权重，或者权重都一样， 会随机选择一个。
2. 有权重：服务器设定有不同的权重，会根据权重，进行随机选择。
### 加权随机思想
假设我们有三个 节点 A、B、C，它们对应的权重分别为 5、2、3，权重总和为 10。现在把这些权重值放到一维坐标轴上，[0, 5) 区间属于节点 A，[5, 7) 区间属于节点 B，[7, 10) 区间属于节点 C，如下图所示：<br />![](https://cdn.nlark.com/yuque/0/2024/jpeg/29466846/1721011538038-c44656ba-efd4-4b20-b454-68249b65cdc0.jpeg)<br />下面我们通过随机数生成器在 [0, 10) 这个范围内生成一个随机数，然后计算这个随机数会落到哪个区间中。例如，随机生成 4，就会落到 A 对应的区间中，此时 RandomLoadBalance 就会返回 A 这个节点。
### 代码实现与讲解
上面的思想固然简单，但是具体到实现中，有很多优化的点，比如如何判断是否需要走加权随机，也就是说有无权重区分？
> 很简单，在遍历处理权重的过程中进行判断即可。

```java
// every upstream has the same weight?
boolean sameWeight = true

if (sameWeight && currentUpstreamWeight != firstUpstreamWeight) {
    // Calculate whether the weight of ownership is the same.
    sameWeight = false;
}
```
那么有权重的随机，我们又应该如何加速寻找服务节点？
> 二分思想，我们其实遍历过程中可以存储一些信息，到我们需要的时候，基于二分来搜索即可。

当随机值小于某个服务器权重时，这个服务器被选中（这里提前计算了前一半服务器的权重和，如果随机值大于`halfLengthTotalWeight`，则遍历从`(weights.length + 1) / 2`开始，提高了小效率）。 若遍历后没有满足条件，就在全部服务器列表中随机选择一个返回。
```java
int totalWeight = firstUpstreamWeight;
int halfLengthTotalWeight = 0;
for (int i = 1; i < length; i++) {
    int currentUpstreamWeight = getWeight(upstreamList.get(i));
    if (i <= (length + 1) / 2) {
        halfLengthTotalWeight = totalWeight;
    }
    weights[i] = currentUpstreamWeight;
    totalWeight += currentUpstreamWeight;
}
```
最终的代码实现如下：
```java
@Override
public Upstream doSelect(final List<Upstream> upstreamList, final String ip) {
    int length = upstreamList.size();
    // every upstream has the same weight?
    boolean sameWeight = true;
    // the weight of every upstream
    int[] weights = new int[length];
    int firstUpstreamWeight = getWeight(upstreamList.get(0));
    weights[0] = firstUpstreamWeight;
    // init the totalWeight
    int totalWeight = firstUpstreamWeight;
    int halfLengthTotalWeight = 0;
    for (int i = 1; i < length; i++) {
        int currentUpstreamWeight = getWeight(upstreamList.get(i));
        if (i <= (length + 1) / 2) {
            halfLengthTotalWeight = totalWeight;
        }
        weights[i] = currentUpstreamWeight;
        totalWeight += currentUpstreamWeight;
        if (sameWeight && currentUpstreamWeight != firstUpstreamWeight) {
            // Calculate whether the weight of ownership is the same.
            sameWeight = false;
        }
    }
    if (totalWeight > 0 && !sameWeight) {
        return random(totalWeight, halfLengthTotalWeight, weights, upstreamList);
    }
    return random(upstreamList);
}

private Upstream random(final int totalWeight, final int halfLengthTotalWeight, final int[] weights, final List<Upstream> upstreamList) {
    // If the weights are not the same and the weights are greater than 0, then random by the total number of weights.
    int offset = RANDOM.nextInt(totalWeight);
    int index = 0;
    int end = weights.length;
    if (offset >= halfLengthTotalWeight) {
        index = (weights.length + 1) / 2;
        offset -= halfLengthTotalWeight;
    } else {
        end = (weights.length + 1) / 2;
    }
    // Determine which segment the random value falls on
    for (; index < end; index++) {
        offset -= weights[index];
        if (offset < 0) {
            return upstreamList.get(index);
        }
    }
    return random(upstreamList);
}
```
## 一致性Hash策略
**一致性 Hash 负载均衡可以让参数相同的请求每次都路由到相同的服务节点上**，这种负载均衡策略可以在某些上游节点下线的时候，让这些节点上的流量平摊到其他上游上，不会引起流量的剧烈波动。
> 解决了传统取余Hash算法的可伸缩性差问题。

### 一致性Hash思想
传统的hash请求，我们通常是取模（Value）% 长度。但是这种算法有一个问题，一个服务节点宕机了，我们需要对长度-1进行重新取模，且重新分配。在极端情况下，甚至会出现所有请求的处理节点都发生了变化，这就会造成比较大的波动。<br />**一致性Hash解决了这个问题，本质上，一致性 Hash 算法的原理也是取模算法，与 Hash 取模的不同之处在于：Hash 取模是对上游节点数量取模，而一致性 Hash 算法是对 2^32 取模。**
```java
hash(上游) % 2^32
```
最终这些结果都会落到Hash环上：<br />![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721012357461-52e5dcec-7c67-48a2-a207-3cd4f201c95f.png#averageHue=%23fcfcfc&clientId=u1e6d4041-b05e-4&from=paste&height=371&id=u4538518b&originHeight=556&originWidth=1060&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=47393&status=done&style=none&taskId=ud51386df-8d2c-4dad-b3ac-e04e9d7d2da&title=&width=706.6666666666666)<br />但是依据有问题，会有数据倾斜：这里可能会导致请求都落到p1上，如果取模结果相差不大的情况下：
> **所谓数据倾斜是指由于节点不够分散，导致大量请求落到了同一个节点上，而其他节点只会接收到少量请求的情况**。

![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721012400486-f397457e-2dbb-4231-92a0-cf20ab068215.png#averageHue=%23fcfcfc&clientId=u1e6d4041-b05e-4&from=paste&height=366&id=ua53df8aa&originHeight=549&originWidth=1099&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=49298&status=done&style=none&taskId=u6e0372de-44ef-4bf4-b64f-f16fc32e055&title=&width=732.6666666666666)<br />为了避免数据倾斜，又演化出了Hash槽的概念，或者叫虚拟节点：<br />![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721012540619-475864c4-ae7b-4a94-bf59-acddd7ad117b.png#averageHue=%23fcfbfa&clientId=u1e6d4041-b05e-4&from=paste&height=370&id=uab35623d&originHeight=555&originWidth=1019&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=56725&status=done&style=none&taskId=u9367aad4-2a5c-40d1-a448-ab214d0da32&title=&width=679.3333333333334)<br />有一个节点虚拟出N个节点，使得他均匀分布到Hash槽上，从而使得节点分布均衡，避免数据倾斜问题。
### Hash环的实现
在实现上使用跳表来实现，简单来说就是类似Redis的有序集合，可以实现logN的范围查询和O1的存取，详细内容看这篇文章：<br />[https://segmentfault.com/a/1190000044039605](https://segmentfault.com/a/1190000044039605)<br />![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721013814138-e96a6ace-93ff-43d1-9d2e-9dd0d463534e.png#averageHue=%23fcfcfc&clientId=u1e6d4041-b05e-4&from=paste&height=747&id=ud8e3fa84&originHeight=1121&originWidth=2407&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=366127&status=done&style=none&taskId=uc439d372-79a6-415d-8a81-cd5291658b9&title=&width=1604.6666666666667)<br />整个算法非常简单：遍历每个节点，为其创造5个虚拟节点，然后插入到有序集合跳表中：

- `tailMap(K fromKey)`方法，可从`map`中查找比`fromKey`大的值的集合，但并不需要遍历整个数据结构。
- 如果没有返回第一个值即可
```java
final ConcurrentSkipListMap<Long, Upstream> treeMap = new ConcurrentSkipListMap<>();
upstreamList.forEach(upstream -> IntStream.range(0, VIRTUAL_NODE_NUM).forEach(i -> {
    long addressHash = hash("API-" + upstream.getUrl() + "-HASH-" + i);
    treeMap.put(addressHash, upstream);
}));
long hash = hash(ip);
SortedMap<Long, Upstream> lastRing = treeMap.tailMap(hash);
if (!lastRing.isEmpty()) {
    return lastRing.get(lastRing.firstKey());
}
return treeMap.firstEntry().getValue();
```
可以感知到，虽然算法理解上似乎很困难，但是落实到具体的代码中，非常简单。
> 当然，你也可以通过TreeMap来实现，dubbo是这样做的：

```java
this.virtualInvokers = new TreeMap<Long, Invoker<T>>();

// 从virtualInvokers集合（TreeMap是按照Key排序的）中查找第一个节点值大于或等于传入Hash值的Invoker对象

Map.Entry<Long, Invoker<T>> entry = virtualInvokers.ceilingEntry(hash);

// 如果Hash值大于Hash环中的所有Invoker，则回到Hash环的开头，返回第一个Invoker对象

if (entry == null) {

    entry = virtualInvokers.firstEntry();

}

return entry.getValue();
```
### 完整实现细节
> 简单来说，模32位的逻辑体现，依赖于hash算法来做，而有序性的维持依赖于跳表来做。

对于Key来说，采用的是加密的单向MD5散列函数，这个hash函数会hash后产生不可预期但确定性的()的结果，输出为32-bit的长整数。<br />一方面，确实实现了取余：
```java
hash(上游) % 2^32
```
另一方面，确实体现了不可预期防止恶意攻击：
```java
private static long hash(final String key) {
    // md5 byte
    MessageDigest md5;
    try {
        md5 = MessageDigest.getInstance("MD5");
    } catch (NoSuchAlgorithmException e) {
        throw new ShenyuException("MD5 not supported", e);
    }
    md5.reset();
    byte[] keyBytes;
    keyBytes = key.getBytes(StandardCharsets.UTF_8);
    md5.update(keyBytes);
    byte[] digest = md5.digest();
    // hash code, Truncate to 32-bits
    long hashCode = (long) (digest[3] & 0xFF) << 24
            | ((long) (digest[2] & 0xFF) << 16)
            | ((long) (digest[1] & 0xFF) << 8)
            | (digest[0] & 0xFF);
    return hashCode & 0xffffffffL;
}
```
最后调用select直接返回结果：
```java
    private static final int VIRTUAL_NODE_NUM = 5;

    @Override
    public Upstream doSelect(final List<Upstream> upstreamList, final String ip) {
        final ConcurrentSkipListMap<Long, Upstream> treeMap = new ConcurrentSkipListMap<>();
        upstreamList.forEach(upstream -> IntStream.range(0, VIRTUAL_NODE_NUM).forEach(i -> {
            long addressHash = hash("API-" + upstream.getUrl() + "-HASH-" + i);
            treeMap.put(addressHash, upstream);
        }));
        long hash = hash(ip);
        SortedMap<Long, Upstream> lastRing = treeMap.tailMap(hash);
        if (!lastRing.isEmpty()) {
            return lastRing.get(lastRing.firstKey());
        }
        return treeMap.firstEntry().getValue();
    }
```
## 加权轮询策略
**轮询是一种无状态负载均衡算法，实现简单，适用于集群中所有上游节点性能相近的场景。** 但现实情况中就很难保证这一点了，因为很容易出现集群中性能最好和最差的上游节点处理同样流量的情况，这就可能导致性能差的上游节点各方面资源非常紧张，甚至无法及时响应了，但是性能好的上游节点的各方面资源使用还较为空闲。这时我们可以通过加权轮询的方式，降低分配到性能较差的上游节点的流量。
### 传统的加权轮询
为了区分，我们给服务节点做了加权。原始定义是顺序循环将请求依次循环地连接到每个服务器。当某个服务器发生故障（例如：一分钟连接不上的服务器)，从候选队列中取出，不参与下一次的轮询，直到其恢复正常。<br />![](https://cdn.nlark.com/yuque/0/2024/jpeg/29466846/1721011538038-c44656ba-efd4-4b20-b454-68249b65cdc0.jpeg)<br />但是这种算法明显有一个问题，如果始终顺序执行，A被打满的概览远远大于B和C，会出现AAAAABBCCC的情况。显然不够平滑。
### 平滑的设计
参考Nginx的平滑实现，会遍历上游列表，并用对应的权重加上其配置的权重。遍历完成后，再找到最大的权重，将其减去权重总和，然后返回相应的上游对象。<br />![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721015102794-b2cb03cd-10f9-4f26-a222-e203cdc3cbd3.png#averageHue=%23b5d9d5&clientId=u1e6d4041-b05e-4&from=paste&height=255&id=u2e7e9bbd&originHeight=383&originWidth=1111&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=257243&status=done&style=none&taskId=u8b270f85-eea4-4c2b-9f2c-a7780951987&title=&width=740.6666666666666)<br />显然这种实现相比前面，就显得平滑了，不会出现AAAAABBCCC的情况。
### 实现细节分析
为了区分当前权重，我们对权重对象做了一个新的封装：

- `setWeight(final int weight)` ，为对象设定权重，并将current重置为0.
- `increaseCurrent()` : 对`AtomicLong`类型的对象`current`，累加其权重值。
- `sel(final int total)`: `current`减去传入的 `total`值。
```java
protected static class WeightedRoundRobin {

    private int weight;
    
    private final AtomicLong current = new AtomicLong(0);

    private long lastUpdate;

    void setWeight(final int weight) {
        this.weight = weight;
        current.set(0);
    }
    long increaseCurrent() {
        return current.addAndGet(weight);
    }

    void sel(final int total) {
        current.addAndGet(-1 * total);
    }
    void setLastUpdate(final long lastUpdate) {
        this.lastUpdate = lastUpdate;
    }
}
```
用一个Map来重新封装上游节点：
```java
private final ConcurrentMap<String, ConcurrentMap<String, WeightedRoundRobin>> methodWeightMap = new ConcurrentHashMap<>(16);
```
最后将我们的权重平滑逻辑封装成代码即可，会有一个Map做缓存：
```java
@Override
public Upstream doSelect(final List<Upstream> upstreamList, final String ip) {
    // 拿到对应的Map
    String key = upstreamList.get(0).getUrl();
    ConcurrentMap<String, WeightedRoundRobin> map = methodWeightMap.get(key);
    if (Objects.isNull(map)) {
        methodWeightMap.putIfAbsent(key, new ConcurrentHashMap<>(16));
        map = methodWeightMap.get(key); 
    }
    
    int totalWeight = 0;
    long maxCurrent = Long.MIN_VALUE;
    long now = System.currentTimeMillis();
    Upstream selectedInvoker = null;
    WeightedRoundRobin selectedWeightedRoundRobin = null;

    //更新每个节点的当前权重
    for (Upstream upstream : upstreamList) {
        String rKey = upstream.getUrl();
        WeightedRoundRobin weightedRoundRobin = map.get(rKey);
        int weight = getWeight(upstream);
        if (Objects.isNull(weightedRoundRobin)) {
            weightedRoundRobin = new WeightedRoundRobin();
            weightedRoundRobin.setWeight(weight);
            map.putIfAbsent(rKey, weightedRoundRobin);
        }
        if (weight != weightedRoundRobin.getWeight()) {
            // weight changed.
            weightedRoundRobin.setWeight(weight);
        }
        long cur = weightedRoundRobin.increaseCurrent();
        weightedRoundRobin.setLastUpdate(now);

        // 找到当前的权重最大的
        if (cur > maxCurrent) {
            maxCurrent = cur;
            selectedInvoker = upstream;
            selectedWeightedRoundRobin = weightedRoundRobin;
        }
        totalWeight += weight;
    }
    ......  //erase the section which handles the time-out upstreams. 
    if (selectedInvoker != null) {
        selectedWeightedRoundRobin.sel(totalWeight);
        return selectedInvoker;
    }
    // should not happen here
    return upstreamList.get(0);
}
```
![image.png](https://cdn.nlark.com/yuque/0/2024/png/29466846/1721015370132-88b3e628-d0e8-4fa3-b7c9-e276ea9db776.png#averageHue=%23f9f8f4&clientId=u1e6d4041-b05e-4&from=paste&height=421&id=ud247e239&originHeight=632&originWidth=1461&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=195641&status=done&style=none&taskId=uccd0616d-0f10-415a-8815-fbad6681fc6&title=&width=974)
### 异常处理
因为过程是对拿到的上游列表做处理的，所以无所谓中间的异常，但是后面需要从Map中移除，所以这里也做了一个异常处理：

- 当服务器的个数与map个数不一样，就对methodWeightMap 加锁做处理。 用先copy 后modify的方式， 把超时的服务器remove掉，即移除掉发生故障的服务器，并更新Map资料。
```java
if (!updateLock.get() && upstreamList.size() != map.size() && updateLock.compareAndSet(false, true)) {
    try {
        // copy -> modify -> update reference.
        ConcurrentMap<String, WeightedRoundRobin> newMap = new ConcurrentHashMap<>(map);
        newMap.entrySet().removeIf(item -> now - item.getValue().getLastUpdate() > recyclePeriod);
        methodWeightMap.put(key, newMap);
    } finally {
        updateLock.set(false);
    }
}
if (Objects.nonNull(selectedInvoker)) {
    selectedWeightedRoundRobin.sel(totalWeight);
    return selectedInvoker;
}
// should not happen here.
return upstreamList.get(0);
```
### 数学验证
接着来验证这个合理性和平滑性：
> 首先是权重合理性：

假如有n个结点，记第i个结点的权重是xi。<br />设总权重为 S=x1 + x2 + … + xn<br />选择分两步

1. 为每个节点加上它的权重值
2. 选择最大的节点减去总的权重值

n个节点的初始化值为[0, 0, …, 0]，数组长度为n，值都为0。<br />第一轮选择的第1步执行后，数组的值为[x1, x2, …, xn]。<br />假设第1步后，最大的节点为j，则第j个节点减去S。<br />所以第2步的数组为[x1, x2, …, xj-S, …, xn]。 <br />执行完第2步后，数组的和为<br />x1 + x2 + … + xj-S + … + xn => x1 + x2 + … + xn - S = S - S = 0。<br />由此可见，每轮选择，第1步操作都是数组的总和加上S，第2步总和再减去S，所以每轮选择完后的数组总和都为0，必定会有逻辑闭环。<br />假设总共执行S轮选择，记第i个结点选择mi次。第i个结点的当前权重为wi。 假设节点j在第t轮(t < S)之前，已经被选择了xj次，记此时第j个结点的当前权重为wj=t*xj-xj*S=(t-S)*xj<0， 因为t恒小于S，所以wj<0。<br />前面假设总共执行S轮选择，则剩下S-t轮，上面的公式wj=(t-S)*xj+(S-t)*xj=0。 所以在剩下的选择中，wj永远小于等于0，由于上面已经证明任何一轮选择后， 数组总和都为0，则必定存在一个节点k使得wk>0，永远不会再选中xj。<br />由此可以得出，第i个结点最多被选中xi次，即mi<=xi。<br />因为 S=m1+m2+…+mn 且 S=x1 + x2 + … + xn。 所以，可以得出mi==xi。
> 接着是平滑性：

证明平滑性，只要证明不要一直都是连续选择那一个节点即可，小于0下一轮都不选了。<br />跟上面一样，假设总权重为S，假如某个节点xi连续选择了t(t<xi)次，只要存在下一次选择的不是xi，即可证明是平滑的。<br />假设t=xi-1，此是第i个结点的当前权重为 wi=t*xi-t*S=(xi-1)*xi-(xi-1)*S。<br />证明下一轮的第1步执行完的值wi+xi不是最大的即可。<br />wi+xi => (xi-1)*xi-(xi-1)*S+xi => xi2-xi*S+S => (xi-1)*(xi-S)+xi<br />因为 xi 恒小于S，所以 xi-S<=-1。 所以上面：(xi-1)*(xi-S)+xi <= (xi-1)*-1+xi = -xi+1+xi = 1。<br />所以，第t轮后，再执行完第1步的值 wi+xi<=1。<br />如果这t轮刚好是最开始的t轮，则必定存在另一个结点j的值为xj*t，所以有 wi+xi<=1<1*t<xj*t。<br />所以下一轮肯定不会选中x。
## 流量预热实现
在上面，为了平滑，引入了特殊的加权轮询策略，为了可伸缩性，引入了一致性hash，那么除此之外，从上游节点考虑，我们还需要考虑一个点就是流量预热。考虑流量预热(warmup)的核心思想是避免在添加新服务器和启动新JVM时网关性能不佳。
### 实现思考
简单来说，就是让刚启动的服务提供方应用不承担全部的流量，而是让它被调用的次数随着时间的移动慢慢增加，最终让流量缓和地增加到跟已经运行一段时间后的水平一样。<br />现在是要控制调用方发送到服务提供方的流量。可以先简单地回顾下调用方发起的调用流程是怎样的，调用方应用通过服务发现能够获取到服务提供方的 IP 地址，然后每次发送请求前，都需要通过负载均衡算法从连接池中选择一个可用连接。那这样的话，是不是就可以让负载均衡在选择连接的时候，区分一下是否是刚启动不久的应用？对于刚启动的应用，可以让它被选择到的概率特别低，但这个概率会随着时间的推移慢慢变大，从而实现一个动态增加流量的过程。<br />首先对于调用方来说，要知道服务提供方的启动时间。这里给出两种方法，一种是服务提供方在启动的时候，把自己启动的时间告诉注册中心；另外一种就是注册中心收到的服务提供方的请求注册时间。调用方通过服务发现，除了可以拿到 IP 列表，还可以拿到对应的启动时间。<br />上面介绍过一种基于权重的负载均衡，但是这个权重是由服务提供方设置的，属于一个固定状态。现在要让这个权重变成动态的，并且是随着时间的推移慢慢增加到服务提供方设定的固定值。<br />这样就可以保证当服务提供方运行时长小于预热时间时，对服务提供方进行降权，减少被负载均衡选择的概率，避免让应用在启动之初就处于高负载状态，从而实现服务提供方在启动后有一个预热的过程。<br />启动预热更多是从调用方的角度出发，去解决服务提供方应用冷启动的问题，让调用方的请求量通过一个时间窗口过渡，慢慢达到一个正常水平，从而实现平滑上线。
### 具体设计
其实实现起来很简单，我们只需要基于时间戳，修改权重接口逻辑即可：当有时间戳，并且当前时间与时间戳间隔在流量预热warmup时间内，权重计算的公式为： min(1,uptime/(warmup/weight))。<br />从公式可以看出，最终的权值，与设置的weight成正比，时间间隔越接近warmup时间，权重就越大。也就是说等待的时间越长，被分派的权重越高。没有时间戳时等其他情况下，返回`Upstream`设置的`weight`值。
```java
// 多了一个权重处理的逻辑，也就是后续要做流量预热相关的计算核心
protected int getWeight(final Upstream upstream) {
    // 上游是否可以用
    if (!upstream.isStatus()) {
        return 0;
    }
    // 传入时间，流量预热，权重
    return getWeight(upstream.getTimestamp(), upstream.getWarmup(), upstream.getWeight());
}

private int getWeight(final long timestamp, final int warmup, final int weight) {
    if (weight > 0 && timestamp > 0) {
        int uptime = (int) (System.currentTimeMillis() - timestamp); // 时间间隔
        if (uptime > 0 && uptime < warmup) { // 时间间隔在时间范围内
            return calculateWarmupWeight(uptime, warmup, weight); // 预热阶段的权重要做新的计算
        }
    }
    return weight; // 否则直接返回权重
}

private int calculateWarmupWeight(final int uptime, final int warmup, final int weight) {
    // min(1,uptime/(warmup/weight))
    // 最终的权重，与设置的weight成正比，时间间隔越接近warmup时间，权重就越大
    // 等待的时间越长，被分派的权重越高，没有时间戳时等其他情况下
    int ww = (int) ((float) uptime / ((float) warmup / (float) weight));
    return ww < 1 ? 1 : (Math.min(ww, weight));
}
```
## 其他负载均衡策略
在阅读Dubbo相关实现，注意到引入了其他的注册算法，这里也可以参考学习设计。
### 最短响应时间均衡
最短响应时间的负载均衡算法，也就是从多个上游节点中选出调用成功的且响应时间最短的上游节点，不过满足该条件的上游节点可能有多个，所以还要再使用随机算法进行一次选择，得到最终要调用的上游节点。<br />需要在上游定义中引入一个响应时间戳：
```java
/**
  * response stamp.
*/
private long responseStamp;
```
最后就是基于此做选择了：
```java
    /**
     * 根据特定策略从给定列表中选择上游服务器。
     * 此方法计算每个上游服务器的预估响应时间，并选择预估响应时间最短的服务器。
     * 如果多个上游服务器具有相同的预估响应时间，则执行加权随机选择。
     *
     * @param upstreamList 可用的上游服务器列表。
     * @param ip 客户端IP，可用于基于IP的路由，但此方法中未使用。
     * @return 返回选定的上游服务器。
     */
    @Override
    protected Upstream doSelect(final List<Upstream> upstreamList, final String ip) {
        // 获取上游服务器的数量
        int length = upstreamList.size();
        
        // 将最短响应时间初始化为最大长整型值
        long shortestResponse = Long.MAX_VALUE;
        // 初始化具有最短响应时间的上游服务器计数
        int shortestCount = 0;
        // 存储具有最短响应时间的上游服务器索引
        int[] shortestIndexes = new int[length];
        // 存储每个上游服务器的权重
        int[] weights = new int[length];
        // 存储具有最短响应时间的上游服务器总权重
        int totalWeight = 0;
        // 存储最短响应时间组中第一个上游服务器的权重
        int firstWeight = 0;
        // 标志表示最短响应时间组中的所有上游服务器是否具有相同的权重
        boolean sameWeight = true;

        // 遍历上游服务器列表，计算每个服务器的预估响应时间和权重
        for (int i = 0; i < upstreamList.size(); i++) {
            Upstream upstream = upstreamList.get(i);
            AtomicLong inflight = upstream.getInflight();
            // 根据当前在途请求的数量和成功请求的平均耗时来计算预估响应时间
            long estimateResponse = upstream.getSucceededAverageElapsed() * inflight.get();
            // 获取上游服务器在预热后权重
            int afterWarmup = getWeight(upstream);
            weights[i] = afterWarmup;
            // 如果预估响应时间小于当前记录的最短响应时间
            if (estimateResponse < shortestResponse) {
                shortestResponse = estimateResponse;
                shortestCount = 1;
                shortestIndexes[0] = i;
                totalWeight = afterWarmup;
                firstWeight = afterWarmup;
                sameWeight = true;
            // 如果预估响应时间等于当前记录的最短响应时间
            } else if (estimateResponse == shortestResponse) {
                shortestIndexes[shortestCount++] = i;
                totalWeight += afterWarmup;
                // 如果最短响应时间组中上游服务器的权重不全相同且不是组中的第一个服务器
                if (sameWeight && i > 0
                        && afterWarmup != firstWeight) {
                    sameWeight = false;
                }
            }
        }

        // 如果只有一个上游服务器具有最短响应时间，直接返回该服务器
        if (shortestCount == 1) {
            return upstreamList.get(shortestIndexes[0]);
        }
        // 如果具有最短响应时间的上游服务器权重不全相同且总权重大于0
        if (!sameWeight && totalWeight > 0) {
            // 使用随机数从具有最短响应时间的组中选择上游服务器
            int offsetWeight = ThreadLocalRandom.current().nextInt(totalWeight);
            for (int i = 0; i < shortestCount; i++) {
                int shortestIndex = shortestIndexes[i];
                offsetWeight -= weights[shortestIndex];
                // 如果累积权重小于0，选择当前上游服务器
                if (offsetWeight < 0) {
                    return upstreamList.get(shortestIndex);
                }
            }
        }
        // 如果上述条件均不满足，从具有最短响应时间的组中随机选择上游服务器
        return upstreamList.get(shortestIndexes[ThreadLocalRandom.current().nextInt(shortestCount)]);
    }

```
### 最小活跃数负载均衡
最小活跃数负载均衡算法。它认为当前活跃请求数越小的上游节点，剩余的处理能力越多，处理请求的效率也就越高，那么该上游节点在单位时间内就可以处理更多的请求，所以我们应该优先将请求分配给该上游节点。<br />用一个Map全局维护调用数：
```java
private final Map<String, Long> countMap = new ConcurrentHashMap<>();
```
然后选择一个最小的即可：
```java
@Override
protected Upstream doSelect(final List<Upstream> upstreamList, final String ip) {
    Map<String, Upstream> domainMap = upstreamList.stream()
    .collect(Collectors.toConcurrentMap(Upstream::buildDomain, upstream -> upstream));

    domainMap.keySet().stream()
    .filter(key -> !countMap.containsKey(key))
    .forEach(domain -> countMap.put(domain, Long.MIN_VALUE));

    final String domain = countMap.entrySet().stream()
    // Ensure that the filtered domain is included in the domainMap.
    .filter(entry -> domainMap.containsKey(entry.getKey()))
    .min(Comparator.comparingLong(Map.Entry::getValue))
    .map(Map.Entry::getKey)
    .orElse(upstreamList.get(0).buildDomain());

    countMap.computeIfPresent(domain, (key, actived) -> Optional.of(actived).orElse(Long.MIN_VALUE) + 1);
    return domainMap.get(domain);
}
```
## 最终的使用接入
在接入到具体使用，还有很多细节，比如我们说到的服务节点移除等，这些我们需要做一个线程去维持。
### 心跳检查与维持
对每个选择器做心跳维持：
```java
/**
 * this is upstream .
 */
public final class UpstreamCacheManager {

    private static final UpstreamCacheManager INSTANCE = new UpstreamCacheManager();

    private static final Map<String, List<Upstream>> UPSTREAM_MAP = Maps.newConcurrentMap();

    private UpstreamCheckTask task;

    /**
     * health check parameters.
     */
    private Boolean checkEnable;

    private int poolSize;

    private int checkTimeout;

    private int checkInterval;

    private int healthyThreshold;

    private int unhealthyThreshold;

    /**
     * healthy upstream print parameters.
     */
    private Boolean printEnable;

    private Integer printInterval;

    private UpstreamCacheManager() {
        initHealthCheck();
    }
}
```
对外暴露接口供别人进行提交：
```java
/**
     * Submit .
     *
     * @param selectorId   the selector id
     * @param upstreamList the upstream list
     */
public void submit(final String selectorId, final List<Upstream> upstreamList) {
    List<Upstream> validUpstreamList = upstreamList.stream().filter(Upstream::isStatus).collect(Collectors.toList());
    List<Upstream> existUpstream = MapUtils.computeIfAbsent(UPSTREAM_MAP, selectorId, k -> Lists.newArrayList());
    existUpstream.stream().filter(upstream -> !validUpstreamList.contains(upstream))
    .forEach(upstream -> task.triggerRemoveOne(selectorId, upstream));
    validUpstreamList.stream().filter(upstream -> !existUpstream.contains(upstream))
    .forEach(upstream -> task.triggerAddOne(selectorId, upstream));
    UPSTREAM_MAP.put(selectorId, validUpstreamList);
}
```
对于每个选择器，会定时的去检查服务节点的生命情况，这里通过定时任务线程池做：
```java
private void scheduleHealthCheck() {
    if (checkEnable) {
        task.schedule();
        // executor for log print
        if (printEnable) {
            ThreadFactory printFactory = ShenyuThreadFactory.create("upstream-health-print", true);
            new ScheduledThreadPoolExecutor(1, printFactory)
            .scheduleWithFixedDelay(task::print, printInterval, printInterval, TimeUnit.MILLISECONDS);
        }
    }
}
```
如下是任务：
```java
/**
 * Health check manager for upstream servers.
 */
public final class UpstreamCheckTask implements Runnable {

    /**
     * logger.
     */
    private static final Logger LOG = LoggerFactory.getLogger(UpstreamCheckTask.class);

    private final Map<String, List<Upstream>> healthyUpstream = Maps.newConcurrentMap();

    private final Map<String, List<Upstream>> unhealthyUpstream = Maps.newConcurrentMap();

    private final Object lock = new Object();

    private final AtomicBoolean checkStarted = new AtomicBoolean(false);

    private final List<CompletableFuture<UpstreamWithSelectorId>> futures = Lists.newArrayList();

    private final int checkInterval;

    private ExecutorService executor;

    private int poolSize;

    private int checkTimeout = 3000;

    private int healthyThreshold = 1;

    private int unhealthyThreshold = 1;
}
```
最后会调用到具体的接口方法：
```java
  @Override
    public void run() {
        healthCheck();
    }

    private void healthCheck() {
        try {
            /*
             * If there is no synchronized. when check is done and all upstream check result is in the futures list.
             * In the same time, triggerRemoveAll() called before waitFinish(), there will be dirty data stay in map.
             */
            synchronized (lock) {
                if (tryStartHealthCheck()) {
                    doHealthCheck();
                    waitFinish();
                }
            }
        } catch (Exception e) {
            LOG.error("[Health Check] Meet problem: ", e);
        } finally {
            finishHealthCheck();
        }
    }
```
这里会去维持一些上游接口的信息，比如响应时间等，是否健康等，并作适当的移除。<br />除此之外，因为我们的更新是根据选择器来作维持的，所以对上游节点也做了一些封装：
```java
/**
 * The type Upstream with selector id.
 */
public class UpstreamWithSelectorId {

    private String selectorId;

    private Upstream upstream;
}
```
### 工厂方法
返回对应的扩展实现。
```java
/**
 * Selector upstream.
 *
 * @param upstreamList the upstream list
 * @param algorithm    the loadBalance algorithm
 * @param ip           the ip
 * @return the upstream
 */
public static Upstream selector(final List<Upstream> upstreamList, final String algorithm, final String ip) {
    LoadBalancer loadBalance = ExtensionLoader.getExtensionLoader(LoadBalancer.class).getJoin(algorithm);
    return loadBalance.select(upstreamList, ip);
}
```
### 应用举例
和Dubbo一样，根据路由拿到节点之后，则进行负载均衡调用：
```java
//取到要路由的服务器节点列表。
List<Upstream> upstreamList = UpstreamCacheManager.getInstance().findUpstreamListBySelectorId(selector.getId());
... 
//取到请求的ip
String ip = Objects.requireNonNull(exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress();

//调用Util方法，执行LoadBalancer处理
Upstream upstream = LoadBalancerFactory.selector(upstreamList, ruleHandle.getLoadBalance(), ip);
```
## 总结
从设计角度总结我们的负载均衡模组，具有如下的特点：

1. 可扩展性：面向接口的设计，及基于 SPI 的实现，使得系统具有良好的可扩展性。可以方便的扩展为其他的动态的负载均衡算法，如最少连接方式(least connection)、最快模式( fastest)。并支持集群处理，具有良好的可扩展性。
2. 可伸缩性：采用的一致性hash、权重随机和权重轮询算法，都可以无缝支持集群扩容或缩容。
3. 流量预热等更细致的设计，能带来整体上更为平滑的负载均衡。
