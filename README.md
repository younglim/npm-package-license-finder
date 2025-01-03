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
License Counts:
MIT     102
Apache-2.0      52
ISC     11
BSD-3-Clause    3
BSD-2-Clause    5
...
Total License: 848
```
## Sample Output CSV File
```
glob-parent,ISC,https://github.com/gulpjs/glob-parent#readme,https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz,Gulp Team <team@gulpjs.com> (https://gulpjs.com/),"The ISC License..."

has-ansi,MIT,https://github.com/chalk/has-ansi#readme,https://registry.npmjs.org/has-ansi/-/has-ansi-2.0.0.tgz,authorname,"The MIT License (MIT)

Copyright (c) ... <....@gmail.com> (.....s.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the ""Software""), to deal
in the Software without restriction, including without limitation the rights..."
...
```

## How to run license-formatting.js

```
# Input generated-licenses.csv to the path of your generated license csv from running license-finder.js
# genera-terms is a list of terms of licenses used in place when license info is not available from license-finder.js
# Output licenses-output.txt to list the license details

node license-formatting.js generated-licenses.csv general-terms.csv licenses-output.txt

```



