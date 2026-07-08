const fs = require('fs');

const pages = ['Home', 'Map', 'Search', 'Navigation', 'Buildings', 'BuildingDetails', 'Stalls', 'StallDetails', 'Events', 'Admin', 'Settings'];

pages.forEach(p => {
  const content = `export function ${p}() {\n  return (\n    <div className="p-4">\n      <h1 className="text-2xl font-bold">${p}</h1>\n    </div>\n  );\n}\n`;
  fs.writeFileSync(`src/pages/${p}.tsx`, content);
});
