# GrainTrace Warehouse OS

Responsive prototype for tracking agricultural grain from supplier receipt to cleaning, warehouse inventory and dispatch.

## Features

- Supplier directory and delivery history
- Individual bag identification and original weighing
- Cleaning / reweighing with yield and loss tracking
- Available stock at bag level
- Dispatch log with supplier traceability
- Reports, CSV exports, JSON backup, and example data
- Responsive desktop and mobile navigation

## Run locally

This is a static application. Open `index.html` in a modern browser or serve the repository as a static website.

## Demo-data / storage notice

The sample suppliers, delivery weights and dispatches are fictional. All edits are saved **only in the current browser** using localStorage. This is **not** a production-ready multi-user warehouse system and must not be used for sensitive supplier information. Authentication, shared persistence, secure document storage and audit logging are future work.

## Deployment

The existing Vercel project is `graintrace-warehouse`. Connect this GitHub repository through that project's **Settings → Git** page and select the `main` production branch. No build command or framework is needed (`index.html` is in the project root).
