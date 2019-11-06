# BotScript

A text-based scripting language, dialog system and bot engine for Conversational User Interfaces (CUI)

[![Join the chat at https://gitter.im/yeuai/rivebot-ce](https://badges.gitter.im/yeuai/rivebot-ce.svg)](https://gitter.im/yeuai/rivebot-ce)
[![Git tag](https://img.shields.io/github/tag/yeuai/botscript.svg)](https://github.com/yeuai/botscript)
[![Travis](https://travis-ci.org/yeuai/botscript.svg)](https://travis-ci.org/yeuai/botscript)

> This is a part of project [yeu.ai](https://github.com/yeuai). An open platform for experiment and training Vietnamese chatbot!

# Specification

To get started playing with BotScript, you must follows the following rules:

## definition

A `definition` is an identifier of an entity, a list or a variable.

The syntax start with symbol `!`:

```bash
! name Rivebot
```

The `Rivebot` is value of the variable `name`.

To define a list of items, just enter item in a new line which started with symbol `-`:

```bash
! colors
- red
- green
- blue
```

## comment

Comments make your code or your script clearer, you can add a comment in BotScript document by add symbol `#` at the begining of a line:

```bash
# here is a comment
# here is an other
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

* flows
* conditions
* variables
* commands
* patterns

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

* flows
* prompt

## replies

## prompt

## conditions

## commands

## variables

## patterns

# Examples

See the [`examples/`](./examples) directory.


Contributing
============

Pull requests and stars are highly welcome.

For bugs and feature requests, please [create an issue](https://github.com/yeuai/botscript/issues/new).

License
=======

BotScript is MIT licensed.
