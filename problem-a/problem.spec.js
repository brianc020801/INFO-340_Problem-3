const fs = require('fs');
const cheerio = require('cheerio') //for html testing
const inlineCss = require('inline-css'); //for css testing
const cssParser = require('css');
const md5 = require('md5');

//include custom matchers
const styleMatchers = require('jest-style-matchers');
expect.extend(styleMatchers);

const htmlPath = __dirname + '/index.html';
const html = fs.readFileSync(htmlPath, 'utf-8'); //load the HTML file once
const cssPath = __dirname + '/css/style.css';
const css = fs.readFileSync(cssPath, 'utf-8'); //load the HTML file once

//absolute path for relative loading (if needed)
const baseDir = 'file://'+__dirname+'/';

describe('Source code is valid', () => {
  test('CSS validates without errors', async () => {
    await expect(cssPath).toHaveNoCssLintErrorsAsync();
  })

  test('HTML has not been modified', () => {
    let nospace = html.replace(/\s/g, ''); //strip all whitespace to account for platform modifications
    expect(md5(nospace)).toBe('677cf38ad2990942a47083be6f3c0e28');
    //console.log(md5(nospace));
  })
});

describe('Includes required CSS rules', () => {
  let $; //cheerio instance
  let cssRules;

  beforeAll(async () => {
    //test CSS by inlining properties and then reading them from cheerio
    let inlined = await inlineCss(html, {extraCss: css, url:baseDir, removeLinkTags:false});
    $ = cheerio.load(inlined);
    // console.log(inlined);

    //non-inlined rules by parsing AST tree
    let cssAST = cssParser.parse(css, {source: cssPath});
    cssRules = cssAST.stylesheet.rules.filter((d) => d.type === "rule");
    // console.log(cssRules)
  })

  test('1. Circles are filled gray', () => {
    let circles = $('svg').children('circle');
    //just counting circles down the page
    expect(circles.eq(0).css('fill').toLowerCase()).toEqual('#5f5f5f');
    expect(circles.eq(1).css('fill').toLowerCase()).toEqual('#5f5f5f');
  })

  test('2. Paths have stroke', () => {
    let paths = $('svg').children('path');
    //just counting paths down the page
    expect(paths.eq(0).css('stroke').toLowerCase()).toEqual('#5f5f5f');
    expect(paths.eq(0).css('stroke-width')).toEqual('8px');
    expect(paths.eq(1).css('stroke').toLowerCase()).toEqual('#5f5f5f');
    expect(paths.eq(1).css('stroke-width')).toEqual('8px');
  })

  test('3. Circles are filled white', () => {
    let circles = $('svg').children('circle');
    //just counting paths down the page
    expect(circles.eq(2).css('fill').toLowerCase()).toEqual('white');
    expect(circles.eq(3).css('fill').toLowerCase()).toEqual('white');
  })

  test('4. Circles are filled brown', () => {
    let group = $('svg').children('g').eq(0); //first group
    expect(group.children('circle').eq(0).css('fill').toLowerCase()).toEqual('#573d29');
    expect(group.children('circle').eq(0).css('fill').toLowerCase()).toEqual('#573d29');
  })

  test('5. Circle and rect are filled light gray', () => {
    let group = $('svg').children('g').eq(1); //second group
    expect(group.children('circle').eq(0).css('fill').toLowerCase()).toEqual('#c0c0c0');
    expect(group.children('rect').eq(0).css('fill').toLowerCase()).toEqual('#c0c0c0');
    expect(group.children('rect').eq(0).css('opacity')).not.toEqual('0');

    expect(cssRules.filter((r) => r.selectors.length > 1).length).toBeGreaterThan(0); //has a rule with two selectors (grouped)
  })

  test('6. Path is filled gray with red stroke', () => {
    let paths = $('svg').children('path');
    //just counting paths down the page
    expect(paths.eq(2).css('fill').toLowerCase()).toEqual('#c0c0c0');
    expect(paths.eq(2).css('stroke').toLowerCase()).toEqual('#bd250d');
    expect(paths.eq(2).css('stroke-width')).toEqual('4px');
  })

  test('7. Path is color changes on hover', () => {
    let hoverRules = cssRules.filter((r) => r.selectors.join().includes(':hover'));
    expect(hoverRules.length).toEqual(1); //should have one hover rule

    let hoverRuleDeclarations = hoverRules[0].declarations.filter((d) => d.type === 'declaration') //ignore comments

    expect(hoverRuleDeclarations[0].property).toEqual('fill'); //has 'fill' as property
    expect(hoverRuleDeclarations[0].value.toLowerCase()).toEqual('#bd250d'); //has 'correct color'
  })

  test('8. Rectangles have opacity of 0', () => {
    let rects = $('svg').children('rect');
    //just counting rects down the page
    expect(rects.eq(1).css('opacity')).toEqual('0');
    expect(rects.eq(1).css('opacity')).toEqual('0');
    expect(rects.eq(1).css('opacity')).toEqual('0');
  })

  test('9. Path has no stroke', () => {
    let paths = $('svg').children('path');
    //just counting paths down the page
    let removed = (paths.eq(3).css('stroke') == 'none') || /^0(px)?$/.test(paths.eq(3).css('stroke-width'));
    expect(removed).toBe(true); //has applied a style that removes the stroke
  })
})

