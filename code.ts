let flags = {
  current: '{current}',
  total: '{total}'
};
const types = {
  text: 'TEXT',
  frame: 'FRAME'
}
let objs = [];

function sortObjs(c) {
  objs = objs.sort(function (a, b) {
    return a[c] - b[c];
  });
};

function checkFlags(str, flgs) {
  let findedFlags = [];
  for (let [key, flag] of Object.entries(flgs)) {
    const regexp = new RegExp(`${flag}*`, 'img')
    let f;
    while (f = regexp.exec(str)) {
      findedFlags.push({
        name: flag,
        index: f.index
      })
    }
  }
  findedFlags = findedFlags.sort(function(a, b){return b.index-a.index});
  return findedFlags
}

function replaceFlags(str, to){
  let finalString = str;

  checkFlags(str, flags).forEach(function(item) {
    let substr1 = finalString.substr(0, finalString.indexOf(item.name));
    let substr2 = finalString.substr(substr1.length + item.name.length);

    switch(item.name) {
      case flags.current:
        finalString = `${substr1}${to}${substr2}`;
        break;
      case flags.total:
        finalString = `${substr1}${objs.length}${substr2}`;
    }
  })
  return finalString
}

function changeFrameName(obj, value){
  obj.slide.name = replaceFlags(obj.slide.name, value);
  obj.slide.setPluginData('current', `${obj.slide.name}`);
}

function changeTextContent(obj, value) {
  figma
    .loadFontAsync(obj.fontName)
    .then(() => {
      obj.characters = replaceFlags(obj.characters, value);
      obj.setPluginData('current', `${obj.characters}`);
    });
}

function selectObjs() {
  const proms = []

  figma.currentPage.children.forEach(function(frame){
    if (frame.type == types.frame){
      let title;

      if(frame.name == frame.getPluginData('current')){
        frame.name = frame.getPluginData('initial');
      }

      if (checkFlags(frame.name, flags).length) {
        title = true;
        frame.setPluginData('initial', frame.name);
      } else {
        title = false;
      }

      const unfilteredTextLayers = frame.findAll(obj => obj.type == types.text);

      const filteredTextLayers = [];
      const filteredPromises = [];

      unfilteredTextLayers.forEach(function(obj){
        if (typeof obj.fontName !== "symbol") {
          let promise = figma
            .loadFontAsync(obj.fontName)
            .then(() => {
              if(obj.characters == obj.getPluginData('current')){
                  obj.characters = obj.getPluginData('initial');
              }

              return obj
            })
            .then(obj => {
              if (checkFlags(obj.characters, flags).length) {
                filteredTextLayers.push(obj);
                obj.setPluginData('initial', `${obj.characters}`);
              }
            })

          filteredPromises.push(promise)
        }
      })

      proms.push(Promise.all(filteredPromises)
        .then(() => {
          if (filteredTextLayers.length || title) {
            objs.push({
              slide:  frame,
              texts:  filteredTextLayers,
              title:  title,
              x:      frame.x,
              y:      frame.y
            });
          }
        }))
    }
  });

  return Promise.all(proms)
}

function printData(){
  objs.forEach(function(obj, i){
    const value = `${i+1}`;
    if (obj.title) {
      changeFrameName(obj, value);
    }
    if (obj.texts) {
      obj.texts.forEach(function(obj2){
        changeTextContent(obj2, value);
      });
    }
  });
}

const promise = selectObjs();
promise.then(() => {
  switch (figma.command) {
    case '↓':
      sortObjs('y');
      break;
    case '→':
      sortObjs('x');
      break;
    case '↘':
      sortObjs('x');
      sortObjs('y');
  }
  printData();
  figma.closePlugin();
});
