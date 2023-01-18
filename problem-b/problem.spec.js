const fs = require('fs');
const cheerio = require('cheerio') //for html testing
const inlineCss = require('inline-css'); //for css testing
const cssParser = require('css');
const cssExpander = require('inline-style-expand-shorthand');

//utility method, from stackoverflow
const camelize = s => s.replace(/-./g, x=>x.toUpperCase()[1])

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
  test('HTML validates without errors', async () => {
    const lintOpts = {
      'attr-bans':['align', 'background', 'bgcolor', 'border', 'frameborder', 'marginwidth', 'marginheight', 'scrolling', 'style', 'width', 'height'], //adding height, allow longdesc
      'tag-bans':['style','b'], //<i> allowed for font-awesome
      'doctype-first':true,
      'doctype-html5':true,
      'html-req-lang':true,
      'attr-name-style': false, //for meta tags
      'line-end-style':false, //either way
      'indent-style':false, //can mix/match
      'indent-width':false, //don't need to beautify
      'line-no-trailing-whitespace': false, //don't need to beautify
      'id-class-style':false, //I like dashes in classnames
      'img-req-alt':true,
      'spec-char-escape':false //disable for Google Font urls
    }

    await expect(htmlPath).toHaveNoHtmlLintErrorsAsync(lintOpts);
  })

  test('CSS validates without errors', async () => {
    await expect(cssPath).toHaveNoCssLintErrorsAsync();
  })
});

describe('Includes required CSS rules', () => {
  let $; //cheerio instance

  beforeAll(async () => {
    //test CSS by inlining properties and then reading them from cheerio
    let inlined = await inlineCss(html, {extraCss: css, url:baseDir, removeLinkTags:false});
    $ = cheerio.load(inlined);
    // console.log(inlined);

    //non-inlined rules by parsing AST tree
    let cssAST = cssParser.parse(css, {source: cssPath});
    cssRules = cssAST.stylesheet.rules.filter((d) => d.type === "rule");
  })

  test('Page uses border-box sizing', () => {
    let allElemRules = cssRules.filter((r) => r.selectors.join() === "*");

    expect(allElemRules.length).toEqual(1); //should have 1 rule applying to all elements
    let allElemRuleDeclarations = allElemRules[0].declarations.filter((d) => d.type === 'declaration') //ignore comments

    let boxSizingDeclaration = allElemRuleDeclarations.filter((d) => d.property === 'box-sizing');
    expect(boxSizingDeclaration[0].value).toEqual('border-box'); //set to border-box
  })

  describe('Page has appropriate fonts', () => {

    test('Includes font links in HTML', () => {
      //included font links
      let nunitoSansLink = $('link').filter((i,el) => $(el).attr('href').includes('Nunito+Sans'));
      expect(nunitoSansLink.length).toEqual(1); //html includes Nunito Sans
      let ralewayLink = $('link').filter((i,el) => $(el).attr('href').includes('Raleway'));
      expect(ralewayLink.length).toEqual(1); //html includes Raleway
    })

    test('Has correct font styling', () => {
      let body = $('body');
      let bodyFontFamilySingleQuotes = (body.css('font-family')).replace(/"/g, '\'');
      expect(bodyFontFamilySingleQuotes).toMatch(/'Nunito Sans', *'?Arial'?, *sans-serif/);
      expect(body.css('font-size')).toEqual('16px');
  
      let h1 = $("h1")
      let h2 = $("h2")
      let h1FontFamilySingleQuotes = (h1.css('font-family')).replace(/"/g, '\'');
      let h2FontFamilySingleQuotes = (h2.css('font-family')).replace(/"/g, '\'');
      expect(h1FontFamilySingleQuotes).toMatch(/'?Raleway'?, *'?Helvetica'?, *sans-serif/);
      expect(h2FontFamilySingleQuotes).toMatch(/'?Raleway'?, *'?Helvetica'?, *sans-serif/);
  
      expect(h1.css('font-weight')).toEqual('300');
      expect(h2.css('font-weight')).toEqual('300');
      expect(h1.css('font-size')).toEqual('3.5rem');
      expect(h2.css('font-size')).toEqual('2rem'); 
    })

    test('Styles Material icons', () => {
      let materialLink = $('link').filter((i,el) => $(el).attr('href').includes('Material+Icons'));
      expect(materialLink.length).toEqual(1); //html includes Material Icons
  
      let materialIcons = $('.material-icons');
      expect(materialIcons.css('position')).toEqual('relative');
      expect(materialIcons.css('top')).toEqual('5px');  
    })
  })

  describe('Page has appropriate general spacing', () => {
    test('Elements have correct margins and padding', () => {
      let containers = $('.container');
      expect(containers.css('max-width')).toEqual('960px');
      expect(containers.css('margin-left')).toEqual('auto');
      expect(containers.css('margin-right')).toEqual('auto');
      expect(containers.css('padding')).toEqual('1rem'); //requires shortcut property

      // let containerElemRules = cssRules.filter((r) => r.selectors.join() === ".container");
      // expect(containerElemRules.length).toEqual(1); //should have 1 rule applying to container element
      // let containerElemRuleDeclarations = containerElemRules[0].declarations.filter((d) => d.type === 'declaration') //ignore comments
      // let paddingDeclaration = containerElemRuleDeclarations.filter((d) => d.property === 'padding');
      // expect(paddingDeclaration[0].value).toEqual('1rem'); //set the padding with 1 shortcut property

      let headings = $("h1, h2");
      expect(headings.css('margin-top')).toEqual('0');
      expect(headings.css('margin-bottom')).toMatch(/^0?.5rem/);

      let contentElems = $('p, dl');
      expect(contentElems.css('margin-top')).toEqual('0');
      expect(contentElems.css('margin-bottom')).toEqual('1rem');  
    })
  })

  describe('Navbar is correctly styled', () => {
    test('Nav elements have correct styling', () => {
      let nav = $('nav')
      expect(nav.css('position')).toEqual('fixed');
      expect(nav.css('top')).toEqual('0');
      expect(nav.css('left')).toEqual('0');
      expect(nav.css('width')).toEqual('100%');
      expect(nav.css('color')).toEqual('white');
      expect(nav.css('background-color').toLowerCase()).toEqual('#2c96bf');
  
      let navElemRules = cssRules.filter((r) => r.selectors.join() === "nav");
      expect(navElemRules.length).toEqual(1); //should have 1 rule applying to container element
      let navElemRuleDeclarations = navElemRules[0].declarations.filter((d) => d.type === 'declaration') //ignore comments
      let navElemProperties = navElemRuleDeclarations.reduce((current, newDeclaration) => {
        let newProp = {}
        newProp[camelize(newDeclaration.property)] = newDeclaration.value;
        return {...current, ...newProp}; //merge
      }, {})
      navElemProperties = cssExpander.expandWithMerge(navElemProperties); //way too much work...
  
      expect(navElemProperties['paddingTop']).toMatch(/^0?.5rem/); //parsed property
      expect(navElemProperties['paddingLeft']).toMatch(/^0?.5rem/); //parsed property
      expect(navElemProperties['paddingBottom']).toEqual('1rem'); //parsed property
      expect(navElemProperties['paddingRight']).toMatch(/^0?.5rem/); //parsed property

      // test('List of nav links have correct styling', () => {
        let navList = $('nav ul');
        expect(navList.css('padding')).toEqual('0');
        expect(navList.css('margin')).toEqual('0');
    
        let navListItems = $('nav li');
        expect(navListItems.css('display')).toEqual('inline');
        expect(navListItems.css('margin')).toEqual('0 1rem'); //requires shortcut property
    
        let navLinks = $('nav a');
        expect(navLinks.css('color')).toEqual('black');
        expect(navLinks.css('text-decoration')).toEqual('none');  
      // })
    })
    
    test('Nav links include hover effects', () => {
      let hoverRules = cssRules.filter((r) => r.selectors.join().includes(':hover'));
      expect(hoverRules.length).toEqual(1); //should have one hover rule
      expect(hoverRules[0].selectors.join().includes(':active')); //hover rule also applies to active
      expect(hoverRules[0].selectors.join().includes(':focus')); //hover rule also applies to focus
  
      let hoverRuleDeclarations = hoverRules[0].declarations.filter((d) => d.type === 'declaration') //ignore comments
  
      let colorDeclaration = hoverRuleDeclarations.filter((d) => d.property === 'color');
      expect(colorDeclaration[0].value.toLowerCase()).toEqual('#f0f0f0'); //color changes on hover
  
      let bottomBorderDeclarations = hoverRuleDeclarations.filter((d) => d.property.includes('border-bottom'));
      let bottomBorderValues = bottomBorderDeclarations.map((d) => d.value).join();
      expect(bottomBorderValues).toMatch(/\.8rem/); //bottom border is correct size
      expect(bottomBorderValues).toMatch(/solid/); //bottom border is solid
      expect(bottomBorderValues.toLowerCase()).toMatch(/#f0f0f0/); //bottom border is correct color  
    })
  })

  describe('Header is correctly styled', () => {
    test('Header elements have correct styling', () => {
      let header = $('header');
      expect(header.css('color')).toEqual('white');
      expect(header.css('padding-top')).toEqual('6rem');
      expect(header.css('padding-bottom')).toEqual('1rem');

      let motto = $('header p');
      expect(motto.css('font-style')).toEqual('italic');
      expect(motto.css('font-size')).toEqual('1.25rem');

      expect(header.css('background-image')).toMatch("url('../img/paul-gilmore-145802-unsplash.jpg')"); //has background-image
      expect(header.css('background-size').includes('contain')); //contained
      expect(header.css('background-position').includes('center')); //centered
      expect(header.css('background-color').toLowerCase()).toEqual('#0084af')
    })
  })

  describe('Menu is correctly styled', () => {
    test('Menu elements have correct styling', () => {
      let menu = $('#menu');
      expect(menu.css('background-color')).toEqual('#f0f0f0');
      
      let terms = $('#menu dt');
      expect(terms.css('font-size')).toEqual('1.25rem');
      expect(terms.css('font-weight')).toEqual('bold');
      expect(terms.css('margin-top')).toEqual('1rem');

      let definitions = $('#menu dd');
      expect(definitions.css('margin')).toEqual('0');

      let images = $('#menu img');
      expect(images.css('height')).toEqual('200px');
      expect(images.css('border-radius')).toEqual('15px');
    })
  })

  describe('About section is correctly styled', () => {
    test('About section elements have correct styling', () => {
      let about = $('#about');
      expect(about.css('background-color')).toEqual('#e0e0e0');
      expect(about.css('line-height')).toEqual('1.5');
    })
  })

  describe('Footer is correctly styled', () => {
    test('Footer elements have correct styling', () => {
      let footer = $('footer');
      expect(footer.css('color')).toEqual('white');
      expect(footer.css('background-color').toLowerCase()).toEqual('#3e1305');

      let footerLinks = $('footer a');
      expect(footerLinks.css('color')).toEqual('white');
      expect(footerLinks.css('text-decoration')).toEqual('none');

      let footerParagraphs = $('footer p');
      expect(footerParagraphs.css('margin')).toEqual('0');
      expect(footerParagraphs.css('line-height')).toEqual('1.25');

      let lastParagraph = $('footer p:last-of-type');
      expect(lastParagraph.css('padding-top')).toEqual('8px');
    })
  })
})
