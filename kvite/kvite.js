const Koa = require('koa')
const fs = require('fs')
const path = require('path') // 绝对路径用path
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')
const app = new Koa()

app.use(async ctx => {
  const {url, query} = ctx.request;
  console.log(url)
  if (url === '/') {
    ctx.type = 'text/html'
    ctx.body = fs.readFileSync(path.join(__dirname, './index.html'), 'utf8')
  } else if (url.endsWith('.js')) {
    // js文件的加载处理
    const p = path.join(__dirname, url)
    ctx.type = 'application/javascript';
    ctx.body = reWriteImport(fs.readFileSync(p, 'utf8'))
  } else if (url.startsWith('/@modules/')) {
    const moduleName = url.replace('/@modules/', '');
    const prefix = path.join(__dirname, '../node_modules', moduleName);
    // package.json中获取module字段
    const module = require(prefix + '/package.json').module;
    const filePath = path.join(prefix, module)
    console.log(filePath)
    const ret = fs.readFileSync(filePath, 'utf8')

    ctx.type = 'application/javascript';
    ctx.body = reWriteImport(ret);
  } else if (url.indexOf('.vue') > -1) {
    
    const p = path.join(__dirname, url.split('?')[0]);
    const file = fs.readFileSync(p, 'utf8');
    const ret = compilerSFC.parse(file);
    // 认为是sfc的请求
    // 读取vue文件，解析为js
    if (!query.type) {
      // console.log(ret)
    // 获取脚本部分内容
    const contentScript = resizeBy.descriptor.script.content;

    // 替换默认导出为一个常量，方便后续修改
    const script = contentScript.replace('export default', 'const __script = ');
    ctx.type = 'application/javascript';
    ctx.body = `
      ${reWriteImport(script)}
      // 解析tpl
      import {render as __render} from '${url}?type=template'
      __script.render = __render;
      export default __script
    `
    } else if (query.type === 'template') {
      const tpl = ret.descriptor.template.content;

      // 编译render
      const render = compilerDOM.compile(tpl, {
        mode: 'module'
      }).code;
      ctx.type = 'application/javascript'
      ctx.body = reWriteImport(render);
    }
    
  }
})

// 裸模块地址重写
function reWriteImport(content) {
  return content.replace(/ from ['"](.*)['"]/g, function(s1, s2) {
    console.log('s1', s1)
    console.log('s2', s2)
    
    if (s2.startsWith('.') || s2.startsWith('./') || s2.startsWith('../')) {
      return s1;
    } else {
      return ` from '/@modules/${s2}'`;
    }
     
  })
}

app.listen(3000, () => {
  console.log('kvite start')
})