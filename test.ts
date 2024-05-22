import _ from 'lodash';

_.resu;

// 假设我们有以下数据和筛选器字符串
const data = [
  { name: 'apple', quantity: 1 },
  { name: 'orange', quantity: 2 },
  { name: 'pear', quantity: 1 },
];
const filterString = '*.name'; // 筛选器字符串

// 创建一个自定义模板，该模板将根据筛选器字符串输出相应的属性
const templateStr = `
  <% 
    // 使用正则表达式解析筛选器字符串
    const filterString = '*.name';
    const filterRegex = /(\\*)?\\.(.+)/;
    const matches = filterString.match(filterRegex);
    const isWildcard = matches[1] === '*';
    const propName = matches[2];
    const result = 'data' + (isWildcard ? '.map(obj => obj[propName])' : '[propName]');
    console.log(result)

    console.log(data, _.result(result))
  %>
`;

// 编译模板
const compiledTemplate = _.template(templateStr);
const result = compiledTemplate({ data });

console.log(result); // ["apple", "orange", "pear"]
