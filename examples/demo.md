# Directive
/include:
- https://raw.githubusercontent.com/yeuai/botscript/master/examples/definition.bot
- https://raw.githubusercontent.com/yeuai/botscript/master/examples/basic.bot

/format: list
{{#each people}}
  {{name}} / {{age}},
{{/each}}

/plugin: test
```js
req.variables.today = new Date().getDate();
req.variables.day = new Date().getDay();
req.variables.year = new Date().getFullYear();
```

# Commands

@ geoip https://api.ipify.org/?format=json

@ list_patient https://raw.githubusercontent.com/yeuai/botscript/master/examples/data/list.json

# Definitions

! ask_iphone
- [4s](iphone) is great

# Define dialogue scripts

+ what is my ip
* true => @geoip
- Here is your ip: $ip

+ what time is it
- It is $time

+ show my list
* true => @list_patient
- Here is your list: $people /format:list

+ howdy
- Today is $today

# enabled plugins
> test  
> addTimeNow
