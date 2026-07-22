# codejson-core

Schema, validation, and assembly logic for code.json.

## About the Project

`codejson-core` is a pure, agency-agnostic TypeScript library that owns the [code.json](https://github.com/DSACMS/gov-codejson) **schema/types**, **validation**, and **assembly/merge/normalization** logic used to describe federal source code metadata. It is meant to provide logic so that consumers (Github Actions, CLI, etc.) can share one contract instead of each duplicating it.

The library has zero runtime dependency on GitHub, the network, or the filesystem. Its only runtime dependencies are `zod` and `zod-validation-error`. It ships a version-pinned copy of the `gov-codejson` schema, a neutral (agency-agnostic) baseline, and a CMS variant, plus a profile factory so additional agencies can be supported without changing core.

### Project Vision

A single, authoritative, reusable source of truth for the code.json contract, so that every tool that produces or validates code.json metadata behaves identically and stays aligned with the published `gov-codejson` schema.

### Project Mission

To provide correct, well-tested, side-effect-free building blocks — schema, validation, and merge/normalization logic — that let federal agencies and their tooling generate and validate code.json files consistently, without reimplementing the rules each time.

### Agency Mission

The Centers for Medicare & Medicaid Services (CMS) serves the public as a trusted partner and steward, dedicated to advancing health equity, expanding coverage, and improving health outcomes.

### Team Mission

The Digital Service at CMS (DSACMS) and the CMS Open Source Program Office are committed to building government software in the open — licensed and structured so that anyone can download, run, and reuse it — and to fostering a welcoming open source community around it.

## Core Team

A list of core team members responsible for the code and documentation in this repository can be found in [COMMUNITY.md](COMMUNITY.md).

<!--
## Repository Structure

TODO: Including the repository structure helps viewers quickly understand the project layout. Using the "tree -d" command can be a helpful way to generate this information, but, be sure to update it as the project evolves and changes over time.

To install the tree command:
In the command line
- MacOS: 
```
brew install tree
```

- Linux: 
```
sudo apt-get update
sudo apt-get install tree
```

Windows:
```
choco install tree
```

**{list directories and descriptions}**

TODO: Add a 'table of contents" for your documentation. Tier 0/1 projects with simple README.md files without many sections may or may not need this, but it is still extremely helpful to provide "bookmark" or "anchor" links to specific sections of your file to be referenced in tickets, docs, or other communication channels.

**{list of .md at top directory and descriptions}**

-->

<!-- TODO
## Development and Software Delivery Lifecycle
This section provides an overview of how this project typically manages code changes and delivers software updates. It is intended to help contributors understand the general flow of work, not to set mandatory procedures. Programs and teams may adjust these practices to meet their own requirements, governance structures, or release schedules.

Project team members with write access work directly in this repository. External contributors follow the same general workflow but submit changes through a fork and cannot merge their own pull requests. Additional guidance for contributing is available in:
[CONTRIBUTING.md](./CONTRIBUTING.md).

This project aligns with the organization’s common approach to versioning, preparing releases, and communicating updates. Rather than restating those details here, please refer to the OSPO Release Guidelines:

[Release Guidelines (OSPO Guide)](https://dsacms.github.io/ospo-guide/outbound/release-guidelines/)

These guidelines outline agency-wide expectations for semantic versioning, release candidates, GitHub releases, and associated review and communication practices. Individual projects may follow this model in full or tailor it to their operational needs.
-->

## Local Development

This project is a single TypeScript library, built and tested with [Bun](https://bun.sh) (package manager, test runner, and script runner) and `tsc` (type-check and JS/declaration emit). It targets Node ≥20 and is ESM-only.

```bash
bun install          # install dependencies
bun test             # run the test suite
bun run typecheck    # type-check without emitting
bun run build        # emit ESM JS + .d.ts to dist/
bun run generate-schema  # (maintenance) regenerate the pinned schema from gov-codejson
```

See [src/README.md](./src/README.md) for an overview of how the library is structured, how the pieces fit together, and an end-to-end usage example.

## Coding Style and Linters

This project uses [ESLint](https://eslint.org/) (`eslint.config.js`, with `typescript-eslint`) and [Prettier](https://prettier.io/) (`.prettierrc`) for linting and formatting.

```bash
bun run lint     # lint with ESLint
bun run format   # format with Prettier
```

Lint and code tests are run on each commit, so linters and tests should be run locally before committing.

<!--
## Branching Model

TODO - with example below:
This project follows [trunk-based development](https://trunkbaseddevelopment.com/), which means:

* Make small changes in [short-lived feature branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/) and merge to `main` frequently.
* Be open to submitting multiple small pull requests for a single ticket (i.e. reference the same ticket across multiple pull requests).
* Treat each change you merge to `main` as immediately deployable to production. Do not merge changes that depend on subsequent changes you plan to make, even if you plan to make those changes shortly.
* Ticket any unfinished or partially finished work.
* Tests should be written for changes introduced, and adhere to the text percentage threshold determined by the project.

This project uses **continuous deployment** using [Github Actions](https://github.com/features/actions) which is configured in the [./github/workflows](.github/workflows) directory.

Pull-requests are merged to `main` and the changes are immediately deployed to the development environment. Releases are created to push changes to production.
-->

## Contributing

Thank you for considering contributing to an Open Source project of the US Government! For more information about our contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Community

The codejson-core team is taking a community-first and open source approach to the product development of this tool. We believe government software should be made in the open and be built and licensed such that anyone can download the code, run it themselves without paying money to third parties or using proprietary software, and use it as they will.

We know that we can learn from a wide variety of communities, including those who will use or will be impacted by the tool, who are experts in technology, or who have experience with similar technologies deployed in other spaces. We are dedicated to creating forums for continuous conversation and feedback to help shape the design and development of the tool.

We also recognize capacity building as a key part of involving a diverse open source community. We are doing our best to use accessible language, provide technical and process documents, and offer support to community members with a wide variety of backgrounds and skillsets.

### Community Guidelines

Principles and guidelines for participating in our open source community are can be found in [COMMUNITY.md](COMMUNITY.md). Please read them before joining or starting a conversation in this repo or one of the channels listed below. All community members and participants are expected to adhere to the community guidelines and code of conduct when participating in community spaces including: code repositories, communication channels and venues, and events.

<!--
## Governance
Information about how the **{project_name}** community is governed may be found in [GOVERNANCE.md](GOVERNANCE.md).

<!--
## Feedback
If you have ideas for how we can improve or add to our capacity building efforts and methods for welcoming people into our community, please let us know at **{contact email}**. If you would like to comment on the tool itself, please let us know by filing an **issue on our GitHub repository.**

## Glossary
Information about terminology and acronyms used in this documentation may be found in [GLOSSARY.md](GLOSSARY.md).
-->

## Policies

### Open Source Policy

We adhere to the [CMS Open Source
Policy](https://github.com/CMSGov/cms-open-source-policy). If you have any
questions, just [shoot us an email](mailto:opensource@cms.hhs.gov).

### Security and Responsible Disclosure Policy

_Submit a vulnerability:_ Vulnerability reports can be submitted through [Bugcrowd](https://bugcrowd.com/cms-vdp). Reports may be submitted anonymously. If you share contact information, we will acknowledge receipt of your report within 3 business days.

For more information about our Security, Vulnerability, and Responsible Disclosure Policies, see [SECURITY.md](SECURITY.md).

### Software Bill of Materials (SBOM)

A Software Bill of Materials (SBOM) is a formal record containing the details and supply chain relationships of various components used in building software.

In the spirit of [Executive Order 14028 - Improving the Nation’s Cyber Security](https://www.gsa.gov/technology/it-contract-vehicles-and-purchasing-programs/information-technology-category/it-security/executive-order-14028), a SBOM for this repository is provided here: https://github.com/DSACMS/codejson-core/network/dependencies.

For more information and resources about SBOMs, visit: https://www.cisa.gov/sbom.

## Public domain

This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/) as indicated in [LICENSE](LICENSE).

All contributions to this project will be released under the CC0 dedication. By submitting a pull request or issue, you are agreeing to comply with this waiver of copyright interest.
