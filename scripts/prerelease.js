const cpx = require('cpx');
const fs = require('fs');

// cpx.copy('LICENSE', 'dist');
cpx.copy('README.md', 'dist');
cpx.copy('CHANGELOG.md', 'dist');

const packageJson = JSON.parse(fs.readFileSync('dist/package.json'));
delete packageJson['$schema'];
delete packageJson['devDependencies'];
delete packageJson['scripts'];
delete packageJson['private'];
delete packageJson['ngPackage'];
delete packageJson['files'];
fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, undefined, 2));
