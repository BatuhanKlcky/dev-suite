# repo-pulse

![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)
![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-blue.svg)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)

**Audit your repository's open-source readiness with a 0–100 health score and auto-fix missing essentials in one command.**

`repo-pulse` scans any local repository for documentation quality, community governance files, CI/CD setup, and hygiene/security pitfalls — giving you an instant actionable checklist and a `--fix` flag to scaffold what's missing.

## Features

- **Zero runtime dependencies** — instant startup with `npx`
- **0–100 Health Score & Grade (`S` / `A` / `B` / `C` / `D`)** across 4 categories:
  - **Documentation (35 pts):** `README.md` depth, key sections, badges/visuals, valid relative links, `CHANGELOG.md`
  - **Community & Governance (25 pts):** OSI `LICENSE`, `CONTRIBUTING.md`, Issue & PR templates
  - **Engineering & CI (25 pts):** `.gitignore`, GitHub Actions CI workflow, automated test suite
  - **Hygiene & Metadata (15 pts):** `.env` leak protection, large file scan (>5 MB), package metadata
- **Smart `--fix` scaffolding** — auto-generates `LICENSE` (MIT), `CONTRIBUTING.md`, GitHub Issue/PR templates, `.gitignore`, and stack-aware CI workflows (Node, Python, Go, Rust) without ever overwriting existing files
- **CI-ready** — `--json` output and `--min-score <n>` gate

## Quick Start

```bash
npx repo-pulse
```

Or scan a specific directory and auto-fix missing essentials:

```bash
npx repo-pulse ./my-project --fix
```

## Example Output

```text
  repo-pulse — Open-Source Readiness Audit
  Target: /path/to/repo-pulse

  Health Score: ████████████████████████████ 100/100  Grade [ S ]

  Documentation            ████████████ 35/35
    ✔ README.md present                (10/10) Found README.md (92 lines).
    ✔ README key sections              (10/10) Covers installation, usage/examples, and license.
    ✔ Badges & visual polish           (5/5) Includes badges/visuals and formatted code examples.
    ✔ Valid relative README links      (5/5) All relative links in README resolve cleanly.
    ✔ CHANGELOG.md present             (5/5) Found CHANGELOG.md.
```

## CLI Options

| Option | Description |
| :--- | :--- |
| `[path]` | Target directory to audit (defaults to current working directory) |
| `--fix` | Auto-generate missing open-source essentials |
| `--dry-run` | Preview what `--fix` would create without writing to disk |
| `--json` | Output machine-readable JSON report |
| `--min-score <n>` | Exit with code `1` if score is below `<n>` |
| `--no-color` | Disable ANSI terminal colors |
| `-h, --help` | Show help message |
| `-v, --version` | Show version number |

## GitHub Actions Usage

Add `repo-pulse` as a quality gate in your CI pipeline:

```yaml
- name: Audit repo readiness
  run: npx repo-pulse --min-score 80
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).
