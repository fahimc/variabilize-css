const fs = require('fs');
const path = require('path');
const Compiler = {
    variablePropertyList:[
        'padding',
        'padding-left',
        'padding-right',
        'padding-top',
        'padding-bottom',
        'margin',
        'margin-left',
        'margin-right',
        'margin-top',
        'margin-bottom',
        'line-height',
        'font-size',
        'font-family',
    ],
    variables:[],
    propCounts:{

    },
    colorIndex:1,
    inputPath:'',
    fileName:'',
    outPath:'',
    init(input,output){
        this.variables=[];
        this.propCounts = {};
        this.colorIndex = 1;
        this.inputPath = path.resolve(input);
        this.outPath = output.replace(/\/$/, '');
        this.fileName = this.inputPath.substring(this.inputPath.lastIndexOf(path.sep) + 1).split('.')[0];
        this.getFile();
    },
    getFile(){
        let content = fs.readFileSync(this.inputPath, 'utf8');
        this.getValues(content);
    },
    getValues(content){
        this.variablePropertyList.forEach((prop)=>{
            //[a-z\-0-9]+\:.*?\;
            const matches = content.match(new RegExp(`${prop}\:.*?\;`,'igm'));
            if (!this.propCounts[prop]) this.propCounts[prop] = 1;
            if (matches) {
                matches.forEach((m)=>{
                    const arr = m.split(':');
                    const prop = arr[0].trim();
                    const value = arr[1].replace(';', '').trim();
                    const hasVariable = this.hasVariable(value.replace('!important', ''), prop);
                    let hasMarginPadding;
                    if (prop == 'padding' || prop == 'margin') {
                        hasMarginPadding = this.hasMarginPadding(value, prop);
                    }
                    if (hasMarginPadding) {
                        console.log(hasMarginPadding)
                            content = content.replace(new RegExp(hasMarginPadding.value, 'igm'), `${hasMarginPadding}`)
                    }else if (hasVariable) {
                        content = content.replace(new RegExp(m,'igm'),`var(--${hasVariable.name})`)
                    }else{
                        const name = `${prop}-${this.propCounts[prop]}`;
                        this.variables.push({
                            prop: prop,
                            name,
                            value: value.replace('!important', ''),
                        });
                        content = content.replace(new RegExp(m, 'igm'), m.replace(value ,`var(--${name})`))
                    }
                    
                    this.propCounts[prop]++;
                });
            }
        });
        content = this.getColor(content);
        this.writeFile(content);
        this.createVariableFile();
    },
    getColor(content) {
        let cm = content.match(/.*?\:.*?(\#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})).*?\;/gim);

        if (cm) {
            cm.forEach((line) => {
                let c = line.match(/\#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gim);
                const prop = line.split(':')[0].trim();
                const hasColor = this.hasColor(c[0]);
                if(hasColor)
                {
                    content = content.replace(new RegExp(c[0], 'igm'), `var(--${hasColor.name})`)
                }else{
                    const name = `color-${this.colorIndex}`;
                    this.variables.push({
                        prop: prop,
                        name,
                        value: c[0],
                    });
                    content = content.replace(new RegExp(c[0], 'igm'), `var(--${name})`)
                    this.colorIndex++;
                }
                
            });
        }
        return content;
    },
    writeFile(content){
        fs.writeFileSync(`${this.outPath}${path.sep}${this.fileName}.css`, content, 'utf8');
    },
    createVariableFile(){
        let content = `:root{\n`;
        this.variables.forEach((obj)=>{
            content += `--${obj.name}: ${obj.value};\n`;
        });
        content += '}';
        fs.writeFileSync(`${this.outPath}/${this.fileName}_variables.css`, content, 'utf8');
    },
    hasMarginPadding(value, prop) {
        const arr = ['top','bottom','left','right'];
        let obj;
        let newVal = [];
        arr.forEach((item)=>{
            const c = value.split(' ');
            let p = `${prop.trim()}-${item}`;
            let v ;
            if(c.length == 4) {
                switch(item) {
                case 'top':
                    v = c[0];
                    break;
                 case 'right':
                 v = c[1];
                 break;
                  case 'bottom':
                  v = c[2];
                  break;
                   case 'left':
                   v = c[3];
                   break;
                }
            } else if (c.length == 3) {
                 switch (item) {
                     case 'top':
                         v = c[0];
                         break;
                     case 'right':
                         v = c[1];
                         break;
                     case 'bottom':
                         v = c[2];
                         break;
                     case 'left':
                         v = c[1];
                         break;
                 }
            } else if (c.length == 2) {
                switch (item) {
                    case 'top':
                        v = c[0];
                        break;
                    case 'right':
                        v = c[1];
                        break;
                    case 'bottom':
                        v = c[0];
                        break;
                    case 'left':
                        v = c[1];
                        break;
                }
            }
            this.variables.forEach(obj => {
                if(obj.prop == p && obj.value.indexOf(v) >=0){
                     if(c.length == 2) {
                         if(item == ('top' || 'bottom')){
                            newVal[0] = obj.name;
                        }else{
                            newVal[1] = obj.name;
                         }
                     } else if (c.length == 3) {
                         if (item == 'top') {
                             newVal[0] = obj.naem;
                         } else if (item == ('left'|| 'right')) {
                             newVal[1] = obj.name;
                         } else if (item == 'bottom') {
                             newVal[2] = obj.name;
                         }
                    } else if (c.length == 4) {
                        if (item == 'top') {
                            newVal[0] = obj.name;
                        } else if (item == 'right') {
                            newVal[1] = obj.name;
                        } else if (item == 'bottom') {
                            newVal[2] = obj.name;
                        } else if (item == 'left') {
                            newVal[3] = obj.name;
                        }
                    }
                 }
            });
        });
       return newVal.join(' ');
    },
    hasVariable(value,prop){
        return this.variables.find(obj => obj.prop == prop && value == obj.value);
    },
    hasColor(value) {
        return this.variables.find(obj => value == obj.value);
    }

}

module.exports = Compiler.init.bind(Compiler);