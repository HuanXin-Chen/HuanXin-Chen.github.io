---
title: SpringBoot3极简上手指南
description: 走进SpringBoot一站式开发
pubDatetime: 2023-08-12
published: true
ogImage: ../../assets/8.png
language: cn
tags:
  - 后端技术
---

## 走进SpringBoot一站式开发

> 本文基于最新的SpringBoot3进行分享，是根据柏码教程（https://itbaima.net/）
> 进行的SpringBoot学习笔记总结。

### 什么是SpringBoot？

Spring Boot让您可以轻松地创建独立的、生产级别的Spring应用程序，并“直接运行”这些应用程序。SpringBoot为大量的第三方库添加了支持，能够做到开箱即用，简化大量繁琐配置，用最少的配置快速构建你想要的项目。在2023年，SpringBoot迎来了它的第三个大版本，随着SpringBoot 3的正式发布，整个生态也迎来了一次重大革新。<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3e3e3738cece4629badf73a86f2162bd~tplv-k3u1fbpfcp-zoom-1.image)<br />在3.X之后的变化相比2.X可以说是相当大，尤其是其生态下的SpringSecurity框架，旧版本项目在升级之后API已经完全发生改变；以及内置Tomcat服务器的升级，Servlet也升级到5以上，从`javax`全新升级到`jakarta`新包名；包括在3.X得到的大量新特性，如支持GraalVM打包本地镜像运行等；并且Java版本也强制要求为17版本。迁移到新版本不仅可以享受到免费维护支持，也可以感受Java17带来的全新体验。

### SpringBoot的功能

介绍了这么多，我们首先还是来看看SpringBoot功能有哪些：

*   能够创建独立的Spring应用程序
*   内嵌Tomcat、Jetty或Undertow服务器
*   提供一站式的“starter”依赖项，以简化Maven配置
*   尽可能自动配置Spring和第三方库
*   提供生产环境下相关功能，如指标、运行状况检查和外部化配置
*   没有任何代码生成，也不需要任何XML配置

### 开始之前的前置技能

*   Java编程语言：Spring Boot是基于Java的框架，因此对Java编程语言的基本概念、语法和特性有一定的了解是必要的。
*   Spring框架：Spring Boot是构建在Spring框架之上的，因此对Spring框架的核心概念和基本用法有所了解是有帮助的。包括Spring的依赖注入（Dependency Injection）、面向切面编程（Aspect-Oriented Programming）、控制反转（Inversion of Control）等。
*   Web开发基础：Spring Boot主要用于构建Web应用程序，因此对Web开发的基本概念和技术有所了解是重要的。包括HTTP协议、RESTful架构风格、Web请求和响应、URL映射等。
*   数据库和SQL：在实际应用中，Spring Boot通常需要与数据库进行交互。因此具备基本的数据库概念和SQL语言的知识是有益的。了解关系型数据库（如MySQL、PostgreSQL）和NoSQL数据库（如MongoDB、Redis）的基础知识也是有帮助的。
*   Maven或Gradle：Spring Boot使用构建工具（如Maven或Gradle）来管理项目的依赖和构建过程。因此，对于这些构建工具的基本概念和用法有所了解是有益的。
*   Spring MVC：Spring MVC是Spring框架的一部分，用于构建Web应用程序。它提供了一种基于MVC（Model-View-Controller）模式的开发方式，用于处理请求和生成响应。虽然Spring Boot可以独立于Spring MVC使用，但了解Spring MVC的基本概念和请求处理流程将有助于理解Spring Boot中的Web开发方面。

> 说了这么多，如果你能顺利完成上面的要求，那我们开始学习，极速上手吧！

## 快速上手

### 极简创建项目

有了SpringBoot，我们可以享受超快的项目创建体验，只需要前往官网进行少量配置就能快速为你生成一个SpringBoot项目模版：

*   <https://start.spring.io/>

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/407a041981424b699625b7351b6d2b3a~tplv-k3u1fbpfcp-zoom-1.image)<br />当然，IDEA神奇已经内置集成了，我们也通过直接在IDEA上创建<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a3dcd526f7314ab8acdb1bbdb27f6e99~tplv-k3u1fbpfcp-zoom-1.image)<br />实现@SpringBootApplication。

```java
@SpringBootApplication
public class BookApplication {

	public static void main(String[] args) {
		SpringApplication.run(BookApplication.class, args);
	}

}
```

测试启动项目，顺利成功！<br />![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0cbb12cddbaa4eb995fd98b529e1f862~tplv-k3u1fbpfcp-zoom-1.image)

### 常用模块整合

首先是最基本的starter模块

```java
<dependency>
     <groupId>org.springframework.boot</groupId>
     <artifactId>spring-boot-starter</artifactId>
</dependency>
```

> 所有的Spring Boot依赖都遵循以"starter"结尾的命名规则，因此在引入其他模块时，我们需要使用"spring-boot-starter-xxxx"这种格式的依赖。这样的规范使得依赖管理变得简单而一致。当然，也有一些特殊情况，例如MyBatis模块并不属于官方提供的"starter"依赖之一，因此我们需要单独导入MyBatis相关的依赖项。

#### 极简的web编写体验

因为Web依赖已经内置Tomcat服务器的Web模块，所以我们不用额外关联Tomcat，一键即可运行。

```java
<dependency>
     <groupId>org.springframework.boot</groupId>
     <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Spring Boot提供了自动包扫描的特性，这意味着我们无需编写繁琐的配置，只需在项目的任意路径下创建组件（如Controller、Service、Component、Configuration等），它们都会被自动识别和生效。需要注意的是，这些组件必须位于主类所在的上级目录或其子包中，否则无法被扫描到。这种约定使得开发更加便捷。<br />此外，Spring Boot还提供了自动序列化对象的功能，即根据配置和约定自动将对象转换为特定的格式，例如JSON。这样，我们无需手动编写大量的序列化代码，Spring Boot会在需要时自动处理对象的序列化和反序列化。<br />当然，如果需要自定义配置，Spring Boot也提供了灵活的扩展机制。我们可以编写自己的配置类，并使用相关注解来定义需要的配置项或进行特定的定制。这样，我们可以根据项目需求进行个性化的配置，满足特定的业务场景。

```java
//只需要添加Configuration用于注册配置类，不需要其他任何注解，已经自动配置好了
@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
                return HandlerInterceptor.super.preHandle(request, response, handler);
            }
        });
    }
}
```

#### SpringSecurity模块简化

```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

启动时，就已经帮助我们配置了一个随机密码的用户可以直接登录使用。

*   默认用户名：user
*   密码：在日志中显示

> 我们也可以自己设定，我们放在后面进行分享。

同样，我们可以自己定义拦截和校验规则。通过编写相应的拦截器和规则，我们可以实现对请求的拦截、验证和处理。这为我们提供了灵活的控制和定制化的需求满足。

```java
//依然只需要Configuration注解即可，不需要其他配置
@Configuration
public class SecurityConfiguration {

  	//配置方式跟SSM是一样的
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(auth -> {
                    auth.anyRequest().authenticated();
                })
                .formLogin(conf -> {
                    conf.loginPage("/login");
                    conf.loginProcessingUrl("/doLogin");
                    conf.defaultSuccessUrl("/");
                    conf.permitAll();
                })
                .build();
    }
}
```

#### 模板解析框架

```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
```

目录：

*   `templates` - 所有模版文件都存放在这里
*   `static` - 所有静态资源都存放在这里

> 注意默认情况：static/static，我们也可以进行自己定义修改，后文分享。

在我们不写任何controller的时候，默认会将index.xml作为首页。

#### 数据库模块

```java
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>3.0.2</version>
</dependency>
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

注意这里的`mybatis-spring-boot-starter`版本需要我们自己指定，因为它没有被父工程默认管理。

> 此外，因为数据库有很多库，所以这种数据库的配置，要我们自己去编写，去连接。
> 后文会讲解如何去配置连接到我们的数据库。

### 自定义运行器

如果我们希望在项目启动完成后立即执行一段代码，我们可以编写自定义的ApplicationRunner来实现这个需求。<br />ApplicationRunner是Spring Boot提供的一个接口，用于在Spring应用程序启动完成后执行特定的逻辑。我们可以实现ApplicationRunner接口，并重写run方法，在该方法中编写我们想要执行的代码。

```java
@Component
public class TestRunner implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) throws Exception {
        System.out.println("我是自定义执行！");
    }
}
```

除了使用ApplicationRunner，我们还可以选择使用CommandLineRunner来在项目启动后执行一段代码。<br />CommandLineRunner是另一个由Spring Boot提供的接口，用于在应用程序启动后执行一些特定的逻辑。与ApplicationRunner类似，我们可以通过实现CommandLineRunner接口，并重写run方法来编写我们的自定义代码。<br />与ApplicationRunner不同的是，CommandLineRunner的run方法接受一个String数组作为参数，这个数组包含了命令行中传递的参数。<br />此外，如果我们希望控制多个实现了CommandLineRunner或ApplicationRunner接口的Bean的执行顺序，我们可以使用@Order注解或实现Ordered接口来指定它们的优先级。

### 编写配置信息

在Spring Boot中，我们可以使用application.properties或application.yml文件来进行配置。这些文件是整个Spring Boot项目的配置文件。<br />application.properties是基于键值对的属性文件，使用简单的key=value格式来配置应用程序的各种属性。<br />而application.yml则是基于YAML（YAML Ain't Markup Language）语法的配置文件，使用缩进和层级结构来表示属性和值的关系，更加直观和易读。<br />通常情况下，开发者更倾向于使用application.yml文件进行配置，因为它的语法更加简洁和可读性更强，尤其在复杂配置的情况下。同时，YAML文件也支持更丰富的数据结构，如列表、映射等，使得配置更加灵活。

```java
一级目录:
    二级目录:
      三级目录1: 值
      三级目录2: 值
      三级目录List: 
      - 元素1
      - 元素2
      - 元素3
```

支持自定义捕获数据`@Value`

```java
@Controller
public class TestController {
    @Value("${test.data}")
    int data;   //直接从配置中去取
}
```

#### 配置服务器端口

```java
server:
  port: 80
```

#### 配置数据源

```java
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/test
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
```

此时使用MyBatis非常简单，可以使用传统的手动扫包

```java
@Configuration
@MapperScan("com.example.mapper")
public class WebConfiguration implements WebMvcConfigurer {
  ...
```

但是推荐直接使用Mapper注解@Mapper

```java
@Mapper
public interface UserMapper {
    @Select("select * from user where id = #{id}")
    User findUserById(int id);
}
```

#### 配置Mvc和Security

```java
spring:  
  #  Spring Mvc相关配置
  mvc:
    static-path-pattern: /static/**   #静态资源解析地址
  # Spring Security 相关配置
  security:
    filter:
      order: -100 #Spring Security 过滤器优先级
    user:
      name: 'admin'   #默认登录用户名
      password: '123456'   #默认登录密码
      roles:    #默认用户的角色
        - admin
        - user
```

### 轻松打包发布

#### 一键命令jar包形式

直接点击Maven中的package<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ebc9542db4040308cf49c3722f32acc~tplv-k3u1fbpfcp-zoom-1.image)<br />只要能够安装JRE环境，都可以通过命令一键运行。

    java -jar jar包

#### 传统tomcat手动war包

首先我们需要排除掉`spring-boot-starter-web`中自带的Tomcat服务器依赖：

    <dependency>
        <groupId>org.springframework.boot</groupId>
           <artifactId>spring-boot-starter-web</artifactId>
           <exclusions>
              <exclusion>
                 <groupId>org.springframework.boot</groupId>
                 <artifactId>spring-boot-starter-tomcat</artifactId>
              </exclusion>
           </exclusions>
    </dependency>

自行添加Servlet依赖：

    <dependency>
       <groupId>jakarta.servlet</groupId>
       <artifactId>jakarta.servlet-api</artifactId>
       <scope>provided</scope>
    </dependency>

最后将打包方式修改为war包：

    <packaging>war</packaging>

接着我们需要修改主类，将其继承SpringBoot需要的Initializer（又回到SSM阶段那烦人的配置了，所以说一点不推荐这种部署方式）

```java
@SpringBootApplication
public class DemoApplication extends SpringBootServletInitializer {  //继承专用的初始化器
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

  	//重写configure方法，完成启动类配置
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(DemoApplication.class);
    }
}
```

最后，我们再次运行Maven 的package指令就可以打包为war包了<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e199db4ab4e34c12b75502cf78228180~tplv-k3u1fbpfcp-zoom-1.image)

> 温馨提示，你的开发环境也需要自己手动配置tomcat信息。
> 反正我不喜欢这种方式，太烦躁了，我们的目标是快速开发！

#### 新的GraalVM支持

> GraalVM 是一种通用的虚拟机，它的核心特性是即时编译器。它提供了一个强大的运行时环境，包括垃圾回收器、即时编译器和线程管理器等，以提供更好的性能和可扩展性。
> GraalVM 的一个重要特点是它的跨语言互操作性。它支持多种编程语言，包括 Java、JavaScript、Python 等，使得不同语言之间的混合编程变得更加容易。
> 虽然 GraalVM 在性能和可扩展性方面具有优势，但在编译过程中，它确实会消耗大量的 CPU 资源。这是因为即时编译器需要将代码转换为本机机器码，以提供更高的执行效率。这个过程通常会导致 CPU 使用率的增加，从而可能使 CPU 温度上升。
> 然而，值得注意的是，编译过程只发生一次，而且它可以将性能改进带来的好处延续到整个应用程序的运行时。因此，在考虑使用 GraalVM 时，需要综合考虑其性能优势和编译过程中的资源消耗。
> 总的来说，GraalVM 是一项技术创新，可以提供更高效的程序运行和跨语言互操作性。尽管编译过程可能会导致 CPU 使用率上升，但整体来说，它可以带来更好的性能和开发体验。

注意，不支持跨平台。

***

首先我们需要安装GraalVM的环境才可以，这跟安装普通JDK的操作是完全一样的，下载地址：

*   <https://github.com/graalvm/graalvm-ce-builds/releases/tag/jdk-17.0.7>

下载好对应系统架构的GraalVM环境之后，就可以安装部署了，首先我们需要为GraalVM配置环境变量，将GRAALVM\_HOME作为环境变量指向你的安装目录的bin目录下，接着我们就可以开始进行打包了（注意，SpringBoot项目必须在创建的时候添加了Native支持才可以，否则无法正常打包）<br />注意，一定要将`GRAALVM_HOME`配置到环境变量中，否则会报错：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/104703ca905e4333a1e60be404f99ae9~tplv-k3u1fbpfcp-zoom-1.image)

***

一切OK，命令输入（建议挂梯子，CPU选择6核及以上）

```java
mvn -Pnative -DskipTests native:compile
```

不过由于Mybatis目前不支持Native-Image，所以只能期待有朝一日这些框架都能够完整支持原生镜像，让我们的程序运行效率更上一层楼。

## 开箱即用日志系统

### 日志门面与日志实现

> 前者是画大饼，后者是真正去做饼。

在Spring Boot中，使用日志门面（Slf4j）是一种常见的做法，它提供了一种统一的方式来处理不同日志框架的日志输出。

> 那么对于不同的框架，又如何做到统一的日志？

Slf4j本身只是一个接口规范，它定义了一组日志输出的方法，如info()、debug()、error()等。这些方法可以在应用程序中使用，而具体的日志实现则由各个框架自行选择和配置。<br />实际上，Slf4j提供了适配器（Adapter）的机制，可以将不同的日志框架与Slf4j进行集成。这样，应用程序中的Slf4j日志调用会被适配到具体的日志实现上，实现了对不同日志框架的统一调用。<br />通过这种偷梁换柱的方式，我们可以在应用程序中使用统一的Slf4j接口进行日志输出，而不需要关心具体的日志实现细节。在Spring Boot中，通常会将Slf4j与Logback作为默认的日志实现，但你也可以根据自己的需求进行配置，使用其他日志框架，如Log4j、Log4j2等。<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/99081e41f5ee412f8b25b9ae8684247e~tplv-k3u1fbpfcp-zoom-1.image)<br />所以，SpringBoot为了统一日志框架的使用，做了这些事情：

*   直接将其他依赖以前的日志框架剔除
*   导入对应日志框架的Slf4j中间包
*   导入自己官方指定的日志实现，并作为Slf4j的日志实现层

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/02b86f4ac8824776a7ad0e3adcd29132~tplv-k3u1fbpfcp-zoom-1.image)

### 打印日志信息

SpringBoot使用的是Slf4j作为日志门面，Logback作为日志实现。

```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-logging</artifactId>
</dependency>
```

第一种打印方式：使用工厂接口

```java
@ResponseBody
@GetMapping("/test")
public User test(){
    Logger logger = LoggerFactory.getLogger(TestController.class); //定位
    logger.info("用户访问了一次测试数据"); //内容
    return mapper.findUserById(1);
}
```

第二种打印方式：Lombok注解

```java
@Slf4j
@Controller
public class MainController {

  	@ResponseBody
		@GetMapping("/test")
    public User test(){
    		log.info("用户访问了一次测试数据");
```

日志级别从低到高分为TRACE < DEBUG < INFO < WARN < ERROR < FATAL，SpringBoot默认只会打印INFO（自己写的）以上级别的信息。

### 日志配置简介

和JUL一样，Logback也能实现定制化，我们可以编写对应的配置文件。而且，我们也可以自己定义banner。<br />这里，不做具体介绍，感兴趣的同学可以参考Logback的官网。您可以访问Logback的官方网站获取更详细的信息：

*   <https://logback.qos.ch>

官方文档中有关于Logback布局（Layouts）的内容，您可以在以下链接中找到相关信息：

*   <https://logback.qos.ch/manual/layouts.html>

此外，您还可以访问网站

*   <https://www.bootschool.net/ascii> ↗

在该网站上生成自己的个性化Banner。

## 多环境配置

在日常开发中，我们项目会有多个环境。例如开发环境（develop）也就是我们研发过程中疯狂敲代码修BUG阶段，生产环境（production ）项目开发得差不多了，可以放在服务器上跑了。不同的环境下，可能我们的配置文件也存在不同，但是我们不可能切换环境的时候又去重新写一次配置文件，所以我们可以将多个环境的配置文件提前写好，进行自由切换。

### Springboot多环境切换

SpringBoot用`application-dev.yml`和`application-prod.yml`分别表示开发环境和生产环境的配置文件<br />为了指定激活的配置文件，您可以在application.yml中进行配置。您可以根据需要设置spring.profiles.active属性的值为dev或prod，以选择相应的配置文件。

```java
spring:
  profiles:
    active: dev
```

### Logback日志系统多环境配置

SpringBoot自带的Logback日志系统也是支持多环境配置的，比如我们想在开发环境下输出日志到控制台，而生产环境下只需要输出到文件即可，这时就需要进行环境配置：

```java
<springProfile name="dev">
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>
</springProfile>

<springProfile name="prod">
    <root level="INFO">
        <appender-ref ref="FILE"/>
    </root>
</springProfile>
```

### Maven打包控制

我们如果希望生产环境中不要打包开发环境下的配置文件呢，我们目前虽然可以切换开发环境，但是打包的时候依然是所有配置文件全部打包，这样总感觉还欠缺一点完美，因此，打包的问题就只能找Maven解决了。<br />通过配置maven，此时在构建选项会多出一些配置选择按钮<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3faa605b1de64b4bae05e4f06355cdb3~tplv-k3u1fbpfcp-zoom-1.image)<br />配置方法如下：

```java
<!--分别设置开发，生产环境-->
<profiles>
    <!-- 开发环境 -->
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <environment>dev</environment>
        </properties>
    </profile>
    <!-- 生产环境 -->
    <profile>
        <id>prod</id>
        <activation>
            <activeByDefault>false</activeByDefault>
        </activation>
        <properties>
            <environment>prod</environment>
        </properties>
    </profile>
</profiles>
```

根据环境的不同，排除其他环境的配置文件：

```java
<resources>
<!--排除配置文件-->
    <resource>
        <directory>src/main/resources</directory>
        <!--先排除所有的配置文件-->
        <excludes>
            <!--使用通配符，当然可以定义多个exclude标签进行排除-->
            <exclude>application*.yml</exclude>
        </excludes>
    </resource>

    <!--根据激活条件引入打包所需的配置和文件-->
    <resource>
        <directory>src/main/resources</directory>
        <!--引入所需环境的配置文件-->
        <filtering>true</filtering>
        <includes>
            <include>application.yml</include>
            <!--根据maven选择环境导入配置文件-->
            <include>application-${environment}.yml</include>
        </includes>
    </resource>
</resources>
```

将Maven中的`environment`属性，传递给SpringBoot的配置文件，在构建时替换为对应的值：

```java
spring:
  profiles:
    active: '@environment@'  #注意YAML配置文件需要加单引号，否则会报错
```

> 注意切换环境之后要重新加载一下Maven项目，不然不会生效！

## 常用模块介绍

### 邮件发送模块

我们在注册很多的网站时，都会遇到邮件或是手机号验证，也就是通过你的邮箱或是手机短信去接受网站发给你的注册验证信息，填写验证码之后，就可以完成注册了，同时，网站也会绑定你的手机号或是邮箱。<br />那么，像这样的功能，我们如何实现呢？SpringBoot已经给我们提供了封装好的邮件模块使用：

```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

常用的邮件协议有两种：

1.  SMTP协议（主要用于发送邮件 Simple Mail Transfer Protocol）
2.  POP3协议（主要用于接收邮件 Post Office Protocol 3）

他们的工作流程如下：<br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/37549a4f66a943498361c70cfc2020b9~tplv-k3u1fbpfcp-zoom-1.image)<br />下面是一个简单使用例子：<br />我们需要先进行邮箱配置（在你的邮箱信息中去查找）

```java
spring:
  mail:
      # 163邮箱的地址为smtp.163.com，直接填写即可
    host: smtp.163.com
    # 你申请的163邮箱
    username: javastudy111@163.com
    # 注意密码是在开启smtp/pop3时自动生成的，记得保存一下，不然就找不到了
    password: AZJTOAWZESLMHTNI
```

然后使用SimpleMailMessage进行简单的邮件封装

```java
@SpringBootTest
class SpringBootTestApplicationTests {

      //JavaMailSender是专门用于发送邮件的对象，自动配置类已经提供了Bean
    @Autowired
    JavaMailSender sender;

    
    @Test
    void contextLoads() {
          //SimpleMailMessage是一个比较简易的邮件封装，支持设置一些比较简单内容
        SimpleMailMessage message = new SimpleMailMessage();
          //设置邮件标题
        message.setSubject("【广州大学大学教务处】关于近期学校对您的处分决定");
          //设置邮件内容
        message.setText("XXX同学您好，经监控和教务巡查发现，您近期存在旷课、迟到、早退、上课刷抖音行为，" +
                "现已通知相关辅导员，请手写5000字书面检讨，并在2028年4月1日17点前交到辅导员办公室。");
          //设置邮件发送给谁，可以多个，这里就发给你的QQ邮箱
        message.setTo("你的QQ号@qq.com");
          //邮件发送者，这里要与配置文件中的保持一致
        message.setFrom("22222111@163.com");
          //OK，万事俱备只欠发送
        sender.send(message);
    }

}
```

### 接口规则校验

在开发过程中，有时候我们需要对接口数据进行校验，此时Springboot能大幅度降低我们的复杂度。

```java
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

我们只需要通过注解的方式进行标记即可。

| 验证注解                          | 验证的数据类型                                                                     | 说明                              |
| ----------------------------- | --------------------------------------------------------------------------- | ------------------------------- |
| [@AssertFalse ](/AssertFalse) | Boolean,boolean                                                             | 值必须是false                       |
| [@AssertTrue ](/AssertTrue)   | Boolean,boolean                                                             | 值必须是true                        |
| [@NotNull ](/NotNull)         | 任意类型                                                                        | 值不能是null                        |
| [@Null ](/Null)               | 任意类型                                                                        | 值必须是null                        |
| [@Min ](/Min)                 | BigDecimal、BigInteger、byte、short、int、long、double 以及任何Number或CharSequence子类型 | 大于等于@Min指定的值                    |
| [@Max ](/Max)                 | 同上                                                                          | 小于等于@Max指定的值                    |
| [@DecimalMin ](/DecimalMin)   | 同上                                                                          | 大于等于@DecimalMin指定的值（超高精度）       |
| [@DecimalMax ](/DecimalMax)   | 同上                                                                          | 小于等于@DecimalMax指定的值（超高精度）       |
| [@Digits ](/Digits)           | 同上                                                                          | 限制整数位数和小数位数上限                   |
| [@Size ](/Size)               | 字符串、Collection、Map、数组等                                                      | 长度在指定区间之内，如字符串长度、集合大小等          |
| [@Past ](/Past)               | 如 java.util.Date, java.util.Calendar 等日期类型                                  | 值必须比当前时间早                       |
| [@Future ](/Future)           | 同上                                                                          | 值必须比当前时间晚                       |
| [@NotBlank ](/NotBlank)       | CharSequence及其子类                                                            | 值不为空，在比较时会去除字符串的首位空格            |
| [@Length ](/Length)           | CharSequence及其子类                                                            | 字符串长度在指定区间内                     |
| [@NotEmpty ](/NotEmpty)       | CharSequence及其子类、Collection、Map、数组                                          | 值不为null且长度不为空（字符串长度不为0，集合大小不为0） |
| [@Range ](/Range)             | BigDecimal、BigInteger、CharSequence、byte、short、int、long 以及原子类型和包装类型          | 值在指定区间内                         |
| [@Email ](/Email)             | CharSequence及其子类                                                            | 值必须是邮件格式                        |
| [@Pattern ](/Pattern)         | CharSequence及其子类                                                            | 值需要与指定的正则表达式匹配                  |
| [@Valid ](/Valid)             | 任何非原子类型                                                                     | 用于验证对象属性                        |

比如对实体对象传入的要求进行限制

```java
@ResponseBody
@PostMapping("/submit")  //在参数上添加@Valid注解表示需要验证
public String submit(@Valid Account account){
    System.out.println(account.getUsername().substring(3));
    System.out.println(account.getPassword().substring(2, 10));
    return "请求成功!";
}
```

```java
@Data
public class Account {
    @Length(min = 3)   //只需要在对应的字段上添加校验的注解即可
    String username;
    @Length(min = 10)
    String password;
}
```

当然，我们此时候的异常是在后台输出，对用户不友好，我们需要重新设置异常处理<br />如果是原子类型@ExceptionHandler(ConstraintViolationException.class)

```java
@ControllerAdvice
public class ValidationController {

    @ResponseBody
    @ExceptionHandler(ConstraintViolationException.class)
    public String error(ValidationException e){
        return e.getMessage();   //出现异常直接返回消息
    }
}
```

如果是非原子类型@ExceptionHandler(MethodArgumentNotValidException)

```java
@ResponseBody
@ExceptionHandler({ConstraintViolationException.class, MethodArgumentNotValidException.class})
public String error(Exception e){
    if(e instanceof ConstraintViolationException exception) {
        return exception.getMessage();
    } else if(e instanceof MethodArgumentNotValidException exception){
        if (exception.getFieldError() == null) return "未知错误";
        return exception.getFieldError().getDefaultMessage();
    }
    return "未知错误";
}
```

### 接口文档生成

在前后端分离开发中，前端现在由专业的人来做，而我们往往只需要关心后端提供什么接口给前端人员调用，我们的工作被进一步细分了，这个时候为前端开发人员提供一个可以参考的文档是很有必要的。<br />那么有没有一种比较好的解决方案呢？<br />那就是Swagger！一个巨好用的神奇。<br />Swagger的主要功能如下：

*   支持 API 自动生成同步的在线文档：使用 Swagger 后可以直接通过代码生成文档，不再需要自己手动编写接口文档了，对程序员来说非常方便，可以节约写文档的时间去学习新技术。
*   提供 Web 页面在线测试 API：光有文档还不够，Swagger 生成的文档还支持在线测试。参数和格式都定好了，直接在界面上输入参数对应的值即可在线测试接口。

结合Spring框架（Spring-doc，官网：<https://springdoc.org/）
，Swagger可以很轻松地利用注解以及扫描机制，来快速生成在线文档，以实现当我们项目启动之后，前端开发人员就可以打开Swagger提供的前端页面，查看和测试接口。>

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.1.0</version>
</dependency>
```

直接访问：<http://localhost:8080/swagger-ui/index.html><br />![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1c6a584cd654427cac5aaab6768638ec~tplv-k3u1fbpfcp-zoom-1.image)<br />可以看到这个开发文档中自动包含了我们定义的接口，并且还有对应的实体类也放在了下面。这个页面不仅仅是展示接口，也可以直接在上面进行调试，堪比Postman，是不是很棒！

## 结束语

以下是Spring Boot官方文档的链接，您可以在其中深入学习和探索更多关于Spring Boot的高级特性和用例：<br />官方文档链接：

*   <https://docs.spring.io>

在官方文档中，您将找到详细的说明、示例代码和最佳实践，涵盖了Spring Boot的各个方面，包括配置、开发、部署、测试、监控和扩展等。通过阅读官方文档，您将更好地了解Spring Boot的原理、特性和用法，并能够充分发挥其在应用程序开发中的优势。<br />总结起来，Spring Boot具有以下主要特点和优势：

*   简化的开发流程：Spring Boot提供了自动配置和默认值，使得开发人员可以快速搭建和启动应用程序，减少了繁琐的配置和部署步骤。
*   内嵌式容器：Spring Boot内置了多种常用的容器，如Tomcat、Jetty等，使得应用程序可以独立运行，无需外部容器的支持。
*   自动化配置：Spring Boot根据应用程序的依赖和环境，自动配置各种组件和框架，大大减少了手动配置的工作量。
*   微服务支持：Spring Boot提供了丰富的功能和库，支持构建和部署微服务架构，使得开发分布式系统变得更加简单。
*   健康监测和管理：Spring Boot提供了健康检查、监控和管理端点，可以方便地监控应用程序的状态和性能，并进行必要的管理操作。
*   开放式扩展：Spring Boot基于Spring框架，拥有强大的扩展性，开发人员可以根据需要集成其他框架和库，实现更多功能和特性。

我对一些初学者常用的模块和知识进行了简单引入，更多内容在官方文档。建议您将文档作为学习和开发过程中的指南，随时查阅和参考。从而更好地应用Spring Boot的功能和特性。祝您在使用Spring Boot的过程中取得愉快和成功的经验！

