# npm-package-license-finder
Identifying licenses of dependencies in package-lock file can be hard. License finder eases the search for licenses within package-lock files, published npm registry, package tarball, and GitHub repos.

## How to run
```
npm install
# Input package-lock.json to the path of your package-lock file.
# Output some-package-licenses.csv to list the license details.
node license-finder.js package-lock.json some-package-licenses.csv
```

## Sample Command-line Output
Counts of each license is generated.
```
...
License information has been written to /Users/some-user/some-path/npm-package-license-finder/some-package-licenses.csv
License	Counts:
ISC	36
MIT	60
BlueOak-1.0.0	8
BSD-2-Clause	1
BSD-3-Clause	1
```

## Sample Output CSV File
```
Dependency,License,Homepage,Tarball URL
node_modules/@isaacs/cliui,ISC,https://github.com/yargs/cliui#readme,https://registry.npmjs.org/@isaacs/cliui/-/cliui-8.0.2.tgz
node_modules/@isaacs/fs-minipass,ISC,https://github.com/npm/fs-minipass#readme,https://registry.npmjs.org/@isaacs/fs-minipass/-/fs-minipass-4.0.1.tgz
node_modules/@npmcli/agent,ISC,https://github.com/kamicane/agent,https://registry.npmjs.org/@npmcli/agent/-/agent-3.0.0.tgz
...
```


