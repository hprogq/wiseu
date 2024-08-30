# WiseU

**This is the backend part of this project.**

This is a back-end project, and the interface documentation (hosted on ApiFox) can be accessed [here](https://apifox.com/apidoc/shared-a8c9f945-903a-4369-941c-ced116e57814).
The interface documentation is created at the time of development and is for reference only. It may be modified at any time and accuracy cannot be guaranteed.

This project uses **bun** as the package manager.

To install `bun`, please visit [here](https://bun.sh/).

To install dependencies:

```bash
bun install
```

This project depends on: MongoDB, ZhipuAI.

Before running this project, please configure the runtime environment and environment variables.
Please make a copy of the `.env.example` file and rename it to `.env` and configure the parameters in it.

Then you can run the server through the following command:

```bash
bun src/server.ts
```

To run with hot reloading enabled, you can use the following command:

```bash
bun --hot src/server.ts
```

If you have any questions, you can contact me through [here](mailto:hhq@live.com).