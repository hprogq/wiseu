# WiseU

**This is the backend part of this project.**

This is a back-end project, and the interface documentation (hosted on ApiFox) can be accessed [here](https://apifox.com/apidoc/shared-a8c9f945-903a-4369-941c-ced116e57814).
The interface documentation is created at the time of development and is for reference only. It may be modified at any time and accuracy cannot be guaranteed.

This project has Corepack enabled, which is built-in by node and is intended to be used to unify the development of versions of member package managers. It is recommended that you enable it.

To enable Corepack:

```bash
corepack enable
```

This project uses pnpm as the package manager.

To install dependencies:

```bash
pnpm install
```

This project depends on: MongoDB, ZhipuAI.

Before running this project, please configure the runtime environment and environment variables.
Please make a copy of the `.env.example` file and rename it to `.env` and configure the parameters in it.

Then you can run the development server through the following command:

```bash
pnpm run dev
```

If you have any questions, you can contact me through [here](mailto:hhq@live.com).