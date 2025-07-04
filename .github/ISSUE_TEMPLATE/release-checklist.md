---
name: Release Checklist
about: Checklist for creating a new release
title: 'Release v[VERSION]'
labels: release
assignees: ''
---

## Release Checklist for v[VERSION]

### Pre-Release Checks
- [ ] All tests pass locally (`npm test`)
- [ ] Coverage is above 80% (`npm run test:coverage`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] All dependencies are up to date
- [ ] Code has been reviewed

### Version Bump
- [ ] Run version bump workflow OR manually:
  ```bash
  npm version [patch|minor|major]
  ```
- [ ] Version updated in `package.json`
- [ ] CHANGELOG.md updated with new version section
- [ ] README.md version references updated (if any)

### Final Checks
- [ ] Pull request created and approved
- [ ] CI checks pass on PR
- [ ] Pre-release workflow validates successfully

### Release
- [ ] Merge PR to main branch
- [ ] Create and push tag:
  ```bash
  git tag v[VERSION]
  git push origin v[VERSION]
  ```
- [ ] Monitor release workflow in Actions tab
- [ ] Verify all release jobs complete successfully:
  - [ ] Version validation passes
  - [ ] Quality checks pass
  - [ ] Multi-platform tests pass
  - [ ] NPM publication successful
  - [ ] GitHub release created
  - [ ] Post-release verification passes

### Post-Release
- [ ] Check NPM package: https://www.npmjs.com/package/hugo-syndicate
- [ ] Check GitHub release: https://github.com/px4n/hugo-syndicate/releases
- [ ] Test installation: `npm install -g hugo-syndicate@[VERSION]`
- [ ] Update documentation if needed
- [ ] Announce release (if applicable)

### If Something Goes Wrong
- [ ] Check Actions logs for errors
- [ ] If NPM publish failed, manually publish:
  ```bash
  npm publish
  ```
- [ ] If GitHub release failed, create manually
- [ ] Document any issues for next release

---
Replace [VERSION] with actual version number