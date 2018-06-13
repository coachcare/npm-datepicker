const cpx = require('cpx');
const fs = require('fs');

cpx.copy('LICENSE', './dist');
cpx.copy('README.md', './dist');
cpx.copy('CHANGELOG.md', './dist');

let packageJson = JSON.parse(fs.readFileSync('package.json', {
  encoding: 'utf8'
}));
const version = packageJson['version'];

// datepicker
packageJson = JSON.parse(fs.readFileSync('./dist/package.json'));
packageJson['version'] = version;

fs.writeFileSync('./dist/package.json', JSON.stringify(packageJson, undefined, 2));