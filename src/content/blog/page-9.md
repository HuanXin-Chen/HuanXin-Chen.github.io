---
title: 反射实现DTO速转VO
description: 实现DTO（数据传输对象）转VO！
pubDatetime: 2023-08-22
published: true
ogImage: ../../assets/9.png
language: cn
tags:
  - 后端技术
---
## 前言
在开发的过程中，我们要常常要实现DTO（数据传输对象）转VO（视图对象）。<br />可能你会问，什么是DTO，什么是VO？
> DTO（Data Transfer Object）数据传输对象<br />1、在服务间的调用中，传输的数据对象<br />2、个人理解，DTO是可以存在于各层服务中（接口、服务、数据库等等）服务间的交互使用DTO来解耦

> VO （view object/value object）表示层对象<br />1、前端展示的数据，在接口数据返回给前端的时候需要转成VO<br />2、个人理解使用场景，接口层服务中，将DTO转成VO,返回给前台

那么，高效的实现DTO（数据传输对象）转VO（视图对象）非常重要。
## 业务场景举例
我们先来看一个业务场景。<br />我们在请求登录成功的时候，我们毫无疑问要从数据库获取信息，并且将部分信息返回到前端。<br />我们从数据库获取信息时的数据传输对象（dto），假设是这样的：
```java
@Data
@TableName("db_account")
@AllArgsConstructor
public class Account implements BaseData {
    @TableId(type = IdType.AUTO)
    Integer id;
    String username;
    String password;
    String email;
    String role;
    @TableField("registerTime")
    Date registerTime;
}
```
而我们返回给前端的时候，不能返回过多的数据，比如密码这些我们肯定不能返回，我们通常返回部分数据回去。
> 假设我们使用jwt的校验方案，那么毫无疑问得返回token回去。

下面是我们要返回的表示层对象（vo）
```java
@Data
public class AuthorizeVO {
    String username;
    String role;
    String token;
    Date expire;
}
```
> 那么从dto传输值到vo。我们有很多方案。

## 方案一：直接手动设置
如下，我们可以这样以get和set的方式，进行手动设置。<br />但是问题也明显，代码冗余，**可维护性差、可读性差、增加错误风险！**<br />后期的开发，我们会有很多的dto和vo对象，如果都是这样手动设置，显然非常低效。
```java
vo.setUsername(account.getUsername());
vo.setToken(token);
vo.setRole(account.getRole());
vo.setExpire(utils.expireTime());
```
## 方案二：使用官方提供工具库
我们可以使用BeanUtils.copyProperties() 去除**重复代码**，BeanUtils.copyProperties()底层是使用了**反射实现。**<br />但是这样我觉得依然不是很优雅，因为他是对相同的值进行设置，我们还要在后面去设置没有相同字段的值。
```java
BeanUtils.copyProperties(account,vo);
```
## 方案三：自己实现dto转vo接口
我们知道，BeanUtils是通过反射机制实现，那我们也可以通过反射实现一个属于自己的dto转vo。<br />我的代码如下：
> 通过反射机制实现了将DTO对象转换为VO对象的功能。它可以通过让DTO类实现BaseData接口并调用接口中的方法来实现转换。转换过程中，会将DTO对象中的字段值复制到VO对象中，从而实现数据的传输和转换。

```java
package com.example.entity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.function.Consumer;

/**
 * 用于DTO快速转换VO实现，只需将DTO类继承此类即可使用
 */
public interface BaseData {

    /**
     * 创建指定的VO类并将当前DTO对象中的所有成员变量值直接复制到VO对象中
     * @param clazz 指定VO类型
     * @param consumer 返回VO对象之前可以使用Lambda进行额外处理
     * @return 指定VO对象
     * @param <V> 指定VO类型
     */
    default <V> V asViewObject(Class<V> clazz, Consumer<V> consumer) {
        V v = this.asViewObject(clazz);
        consumer.accept(v);
        return v;
    }


    /**
     * 创建指定的VO类并将当前DTO对象中的所有成员变量值直接复制到VO对象中
     * @param clazz 指定VO类型
     * @return 指定VO对象
     * @param <V> 指定VO类型
     */
    default <V> V asViewObject(Class<V> clazz) {
        try {
            Field[] fields = clazz.getDeclaredFields();
            Constructor<V> constructor = clazz.getConstructor();
            V v = constructor.newInstance();
            Arrays.asList(fields).forEach(field -> convert(field,v));
            return v;
        } catch (ReflectiveOperationException exception) {
            Logger logger = LoggerFactory.getLogger(BaseData.class);
            logger.error("在VO与DTO转换时出现了一些错误");
            throw new RuntimeException(exception.getMessage());
        }
    }

    /**
     * 内部使用，快速将当前类中目标对象字段同名字段的值复制到目标对象字段上
     * @param field 目标对象字段
     * @param target 目标对象
     */
    private void convert(Field field, Object target) {
        try {
            Field source = this.getClass().getDeclaredField(field.getName());
            field.setAccessible(true);
            source.setAccessible(true);
            field.set(target,source.get(this));
        } catch (IllegalAccessException | NoSuchFieldException ignored) {}
    }
}

```

- 接口定义：BaseData是一个接口，用于提供DTO转换为VO的方法。通过让DTO类实现该接口，就可以使用接口中定义的方法进行转换操作。
- asViewObject方法：这个方法用于创建指定类型的VO对象，并将当前DTO对象中的成员变量值直接复制到VO对象中。它接受一个Class<V>参数，表示指定的VO类型。方法内部使用反射来获取VO类的构造函数，创建一个VO对象，并通过遍历VO类的所有字段，将DTO对象对应字段的值复制到VO对象中。
- asViewObject方法重载：这个方法是对上述方法的重载，添加了一个额外的Consumer<V>参数。这个参数可以使用Lambda表达式，用于在返回VO对象之前对其进行额外处理。例如，可以在这里对VO对象的某些字段进行修改或设置。
- convert方法：这是一个私有方法，用于在内部快速将DTO对象字段的值复制到VO对象字段上。它接受一个目标对象字段和目标对象作为参数。方法内部使用反射来获取DTO对象字段的值，并将其设置到目标对象字段上。

使用方法：
```java
AuthorizeVO vo = account.asViewObject(AuthorizeVO.class, v-> {
    v.setExpire(utils.expireTime());
    v.setToken(token);
});
```
这样，我们不仅可以实现类型BeanUtils的功能，还能利用Lambda，一步到位的实现，减少冗余代码。
