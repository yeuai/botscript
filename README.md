# BotScript

A text-based scripting language, dialog system and bot engine for Conversational User Interfaces (CUI)

[![Join the chat at https://gitter.im/yeuai/rivebot-ce](https://badges.gitter.im/yeuai/rivebot-ce.svg)](https://gitter.im/yeuai/rivebot-ce)
[![Git tag](https://img.shields.io/github/tag/yeuai/botscript.svg)](https://github.com/yeuai/botscript)
[![npm version](https://img.shields.io/npm/v/@yeuai/botscript.svg?style=flat)](https://www.npmjs.com/package/@yeuai/botscript)
[![npm downloads](https://img.shields.io/npm/dm/@yeuai/botscript.svg)](https://www.npmjs.com/package/@yeuai/botscript)
[![Travis](https://travis-ci.org/yeuai/botscript.svg)](https://travis-ci.org/yeuai/botscript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> This is a part of project [yeu.ai](https://github.com/yeuai). An open platform for experiment and training Vietnamese chatbot!

# Documentation

[Read the wiki](https://github.com/yeuai/botscript/wiki) for all the details on how to get started playing with BotScript

# Specification

To get started playing with BotScript, you must follows the following rules:

## definition

A `definition` is an identifier of an entity, a list or a variable.

The syntax start with symbol `!`:

```bash
! name CuteBot
```

The `CuteBot` is value of the variable `name`.

To define a list of items, just enter item in a new line which started with symbol `-`:

```bash
! colors
- red
- green
- blue
```

## comment

Comments make your code clearer, you can add a comment in BotScript document by add symbol `#` at the begining of a line:

```bash
# here is a comment
# here is an other
```

## continuation

The continuation allows the code to break to span multiple of lines. In the case, you can write a really long reply or prompt.

A continuation must start with symbol `^` at the beginning of the line.

Example:

```bash
+ tell me a joke
- As a scarecrow, people say I'm outstanding in my field.
^ But hay - it's in my jeans.
- I told my girlfriend she drew her eyebrows too high.
^ She seemed surprised.
- I have kleptomania.
^ But when it gets bad, I take something for it!
```

## dialogue

A dialogue is a piece of conversation that human and bot interact with each other. 

A dialogue must contains a `+` line, that defines a pattern can activate the bot to respond. This line also called with other name **trigger**.

A dialogue also must contains a `-` line, that defines a pattern response which is output to reply to human.

A dialogue must have at least one reply and one trigger.

```bash
+ message pattern
- message reply
```

Example:

```bash
+ hello bot
- Hello, human!
```

A dialogue may contains:

* triggers
* replies
* flows
* conditions
* variables
* commands
* prompts

## triggers

A trigger is a pattern help bot knows what human is saying.

A trigger begins with symbol `+` in the dialogue.

A trigger may contains **wildcards**. With wildcards, you can set a placeholder within trigger that the bot can capture.

```bash
+ My name is *{name}
- Nice to meet you $name!
```

A dialogue may contains more than one trigger. Which helps bot to detect exactly in more case.

```bash
+ My name is *{name}
+ *{name} is my name
- Nice to meet you $name!
```

A trigger may contains:

* definitions
* patterns
* variable

## replies

A reply begins with `-` symbol in the dialogue and goes with the trigger. If the dialogue has multiple replies then a random reply will be selected.

```bash
+ hello
- Hello. What is your name?
- Hi. Could you tell me your name?
- [yes]. What's your name?
```

A reply may contains:

* definitions
* variables

## flows

Flows are tasks which need to be resolved. A flow can used to determine a precise flow of conversation 

A flow must start with a `~` line, that defines the the task name.

A flow contains lines started with symbol `-` to guide human answers the quiz and may contains lines `+` help the bot captures the information. If the flow does not contains `+`, after responded the flow will ends.

A flow can referenced by an other.

Flows are activated within a dialogue. The bot will respond if all tasks are resolved!

```bash
~ maker
- What cell phone vendor?
- Which brand of smartphone do you want to buy?
+ I want to buy *{maker}
+ *{maker}
```

The dialogue jumps to the splash flow then back to continue.

```bash
~ random
- I am happy to hear you!
- It's fine today.

+ hello *
~ random
- Great!
```

A flow may contains:

* triggers
* replies
* flows
* conditions
* commands
* variables
* prompts

## prompts

Prompt is suggested answers which helps human quickly select and reply.

Prompt must be started with symbol `?`.

Prompt declared in a dialogue, flows or defined within a conditional prompt. If the conditional prompt is satisfied, the prompt in the dialogue will be overrided.

If the dialogue has multiple prompts then a random one will be selected.

Example:

```bash
! pizza_types
- Pepperoni
- Margherita
- Hawaiian

+ I need a pizza
- What kind of pizza?
? [pizza_types]
```

## conditions

There are two categories of conditions in the dialogue:

* [x] **Conditional activation**: monitoring the ability to activate the dialogue in the conversation
* [x] **Conditional reply**: checking the operation process in the dialogue and ability to respond to human

A conditions begins with star symbol: `*`  

Syntax: `* expression`

For example:

```bash
+ knock knock
- who is there

+ *
* $previous[0] == 'who is there'  # must have happened
* $input == 'its me' -> i know you!
- $1 who?
```

A conditional reply allows bot test the conditions and do some logics before replies to human.

Syntax: `* expression [type] [action]`

There are six subcategories of conditional processing:

* Conditional reply
* Conditional flow
* Conditional redirect
* Conditional command
* Conditional prompt
* Conditional event

A conditional reply let bot replies smarter base on the condition or pick random replies from a list definition. That means before reply bot will check its memory and create reponse if the bot knows.

```bash
* $name == undefined -> You never told me your name
```

A conditional flow let bot resolves an additional task if the condition is match.

```bash
* $topic == buy phone ~> ask phone
```

A conditional redirect let bot breaks current dialogue and flows to turn to other dialogue. This helps bot cancel current task and do a new one if the condition is met.

```bash
* $action == cancel >> task cancel
```

A conditional prompt allows bot sending to human additional prompt list. This helps human knows how to reply to the bot after that.

```bash
* $input == i dont know ?> [show the list]
```

A conditional command let bot execute an http POST request to an api endpoint with `req` data context. Once the endpoint returns json data then it will be populated before generate speech response.

```bash
* $input == play music @> play favorite music
* $input == confirm order @> send the order
```

A conditional event can be integrated with code instead of using `conditional command`.

```bash
* $var == true +> event name
```

Example:

```bash

# conditional reply
+ what is my name
* $name == undefined -> You never told me your name.
- Your name is $name!
- Aren\'t you $name?

# conditional flow
+ *advise me
* $topic == buy phone ~> ask phone
* $topic == ask warranty ~> warranty guide
~ ask something
- You are done! Do you want ask more?

# conditional redirect
+ i want to say *{action}
* $action == cancel >> task cancel
* $action == something -> [bot say something]
- You said $action
```

## commands

An action command allow you to do more powerful things with bot's responses.

A command must starting with the sign `@`. Followed by the command name and its API endpoint.

A command can be consumed within a dialogue conditions that means the command only executes if the condition satisfied.

The command will be sent with `req` data context. Once the endpoint returns json data then it will be populated before generate speech response.

Syntax:

```bash
@ COMMAND_NAME [POST|GET] API_ENDPOINT
```

For example, you can allow the user to ask the bot questions about the current weather or about movie ticket prices, and your bot can send an http request that goes out to the internet to fetch that information.

```bash
@ geoip https://api.ipify.org/?format=json
# output result: {"ip":"10.10.10.100"}

+ what is my ip
* true @> geoip
- Here is your ip: $ip.
```

## variables

What good is a chatbot if it can't even remember your name? BotScript has the capability to captures the information given by human and automatically store its into the request context.

A variable appears in a dialogue in both triggers and replies.

A variable is declared within parentheses: `*{var1}` to capture a string and `#{var2}` to captures a number.

A variable is populated in replies by defining after `$var1` sign or within form `${var2}`. 

Example:

```bash
+ My name is *{name}
- Nice to meet you $name!

+ I am #{age} years old
- You are $age
```

## patterns

A pattern within trigger which helps the dialogue `human <-> bot` can be activated and bot has a better capability to reply human.  

Advanced pattern helps bot exactly knows what human is saying.

There are two ways add pattern capability in BotScript:

* Built-in pattern capability using Regular Expression
* Custom pattern capability by add new handler

### 1. Built-in pattern capability using Regular Expression

Built-in pattern capability already supported in BotScript. Just declare and use basic [Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) within form: `/(\w+)\s(\w+)/` and it will capture two words `John Smith`, for example.

A pattern must be wrapped in `/` to use advanced syntax which [XRegExp](http://xregexp.com/) supports.

Example:

```bash
# I like to buy it -> Do you really buy it
# I really need this -> So you need this, right?
+ /^I (?:.+\s)?(\w+) (?:.+\s)?(it|this)/
- Do you really $1 $2?
- So you $1 $2, right?
```

### 2. Custom pattern capability by add new handler

This way, bot is added a new matching handler and trying to match the input which human say, with highest priority. This feature is enabled through code integration.

NLP can be integrated by this way. See [an example](./examples/nlp.js).

Example:

```bash
+ ([ner: PERSON]+) /was|is/ /an?/ []{0,3} /painter|artist/
- An accomplished artist you say.
- Yeah, i know $1!
```

By combining `NLP`, `Command Service`, `Events` you can teach the bot to be smarter.

## plugins

BotScript allows to define plugins which will be activated usage if the one added via code implementation

A plugin started with `>` line for pre, post-processing  
A plugin runs in pipeline of message request processing  
A plugin may contain conditional activation  
A plugin may be grouped in a group  

Syntax:

```bash
> plugin name
* conditional expression
```

Example:

```js
/**
> addTimeNow
> noReplyHandle

+ what time is it
- it is $time
*/
function addTimeNow(req: Request, ctx: Context) {
  const now = new Date()
  req.variables.time = `${now.getHours()} : ${now.getMinutes()}`
}

/**
 * plugin for post-processing
 * */
function noReplyHandle() {
  const postProcessing = (res: Request) => {
    if (res.message === 'NO REPLY!') {
      res.message = `Sorry! I don't understand!`
    }
  }

  return postProcessing
}
```

# Examples

See the [`examples/`](./examples) directory.


Contributing
============

Pull requests and stars are highly welcome.

For bugs and feature requests, please [create an issue](https://github.com/yeuai/botscript/issues/new).

License
=======

BotScript is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
