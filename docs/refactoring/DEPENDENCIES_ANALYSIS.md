# ATLAS Dependencies Analysis & Cleanup Recommendations

**Date:** November 14, 2025  
**Version:** 1.0

## Executive Summary

ATLAS has 139 Python dependencies and 5 Node.js dependencies. This document provides analysis and recommendations for optimization.

---

## Python Dependencies Analysis

### Current Status
- **Total packages**: 139
- **Direct dependencies**: ~45
- **Transitive dependencies**: ~94

### Critical Security Updates Needed

#### High Priority (Security Issues)
1. **cryptography** (41.0.3 → 42.0.0+)
   - Current: 41.0.3
   - Recommended: 42.0.0+
   - Reason: Security patches for key derivation

2. **urllib3** (2.0.4 → 2.1.0+)
   - Current: 2.0.4
   - Recommended: 2.1.0+
   - Reason: HTTP/2 security improvements

3. **requests** (2.31.0 → 2.32.0+)
   - Current: 2.31.0
   - Recommended: 2.32.0+
   - Reason: Dependency updates

### Potentially Unused Packages

#### Audio/Speech Processing (Verify Usage)
- `audioread` - May be redundant with `librosa`
- `av` - Check if used with audio processing
- `soundfile` - Verify if needed alongside `librosa`

#### ML/NLP (Verify Necessity)
- `stanza` - Check if used for NLP tasks
- `nltk` - May overlap with other NLP libraries
- `Distance` - Verify string distance calculations
- `editdistance` - Check if used

#### Utility Libraries (Verify Usage)
- `colorama` - Only used in CLI output
- `humanfriendly` - Check if used for formatting
- `docopt` - Check if used for CLI parsing

### Optimization Opportunities

#### 1. Audio Processing Stack
**Current**: audioread, av, librosa, soundfile, soxr, torchaudio
**Recommendation**: Consolidate to librosa + torchaudio

```python
# Remove: audioread (redundant with librosa)
# Keep: librosa (comprehensive audio processing)
# Keep: torchaudio (PyTorch integration)
# Remove: soundfile (librosa handles this)
# Consider: soxr (only if high-quality resampling needed)
```

#### 2. NLP Stack
**Current**: nltk, stanza, tokenizers, sentencepiece
**Recommendation**: Consolidate based on actual usage

```python
# If using transformers: keep tokenizers, sentencepiece
# If using traditional NLP: keep nltk
# Verify: stanza usage (may be redundant)
```

#### 3. ML/DL Stack
**Current**: torch, torchaudio, einops, numba, numpy, scipy
**Recommendation**: Keep all (core dependencies)

#### 4. Utility Packages
**Current**: colorama, humanfriendly, docopt, emoji
**Recommendation**: Remove if not actively used

---

## Node.js Dependencies Analysis

### Current Status
```json
{
  "@modelcontextprotocol/sdk": "^1.20.2",
  "axios": "^1.12.2",
  "chokidar": "^3.6.0",
  "sharp": "^0.34.4",
  "tail": "^2.2.6"
}
```

### Recommendations

#### 1. Update MCP SDK
- Current: 1.20.2
- Latest: 1.21.0+
- Action: Update to latest stable

#### 2. Update axios
- Current: 1.12.2
- Latest: 1.7.0+
- Action: Update (check breaking changes)

#### 3. Update sharp
- Current: 0.34.4
- Latest: 0.35.0+
- Action: Update for performance improvements

#### 4. Consider Adding
- `dotenv`: For environment variable management
- `pino`: For structured logging
- `joi`: For schema validation

---

## Monorepo Dependencies

### Issue: Duplicate Dependencies
Multiple package.json files across monorepo:
- `/package.json` (root)
- `/orchestrator/package.json`
- `/config/package.json` (if exists)

### Recommendation
1. Consolidate to single root package.json
2. Use workspaces for sub-projects
3. Implement dependency locking

---

## Cleanup Action Plan

### Phase 1: Security Updates (Week 1)
```bash
# Update critical security packages
pip install --upgrade cryptography urllib3 requests

# Update Node.js packages
npm update @modelcontextprotocol/sdk axios sharp
```

### Phase 2: Audit Unused Packages (Week 2)
```bash
# Python: Use pip-audit
pip install pip-audit
pip-audit

# Node.js: Use npm audit
npm audit
npm audit fix
```

### Phase 3: Remove Redundant Packages (Week 3)
```bash
# After verification, remove:
pip uninstall audioread soundfile  # If redundant with librosa
pip uninstall humanfriendly docopt  # If not used
```

### Phase 4: Consolidate Monorepo (Week 4)
```bash
# Consolidate package.json files
# Update npm workspaces configuration
npm install --workspaces
```

---

## Recommended requirements.txt Updates

### High Priority Changes
```diff
- cryptography==41.0.3
+ cryptography==42.0.0

- urllib3==2.0.4
+ urllib3==2.1.0

- requests==2.31.0
+ requests==2.32.0
```

### Optional Removals (After Verification)
```diff
- audioread==3.0.1  # If redundant with librosa
- soundfile==0.12.1  # If librosa handles it
- humanfriendly==10.0  # If not used
- docopt==0.6.2  # If not used
```

### Recommended Additions
```diff
+ pip-audit==2.6.0  # For security auditing
+ safety==2.3.0  # For dependency scanning
```

---

## Dependency Size Impact

### Current Sizes (Estimated)
| Component    | Size   | Optimization           |
| ------------ | ------ | ---------------------- |
| Python venv  | ~2.5GB | Remove unused packages |
| Node modules | ~500MB | Update to latest       |
| Total        | ~3GB   | Could reduce to ~2.5GB |

### Optimization Target
- Remove 10-15 unused packages
- Reduce venv size by ~300-400MB
- Reduce node_modules by ~50MB

---

## Testing Strategy

### Before Cleanup
1. Run full test suite
2. Document baseline performance
3. Create backup of requirements.txt

### During Cleanup
1. Update one package at a time
2. Run tests after each update
3. Monitor for breaking changes

### After Cleanup
1. Run full test suite
2. Compare performance metrics
3. Document improvements

---

## Verification Checklist

- [ ] Audit all Python packages with pip-audit
- [ ] Check npm audit for Node.js packages
- [ ] Verify audioread usage (can librosa replace it?)
- [ ] Verify soundfile usage (can librosa replace it?)
- [ ] Verify stanza usage (necessary for NLP?)
- [ ] Verify humanfriendly usage (CLI output only?)
- [ ] Verify docopt usage (CLI parsing only?)
- [ ] Test after each removal
- [ ] Update documentation
- [ ] Benchmark performance improvements

---

## Long-term Recommendations

### 1. Dependency Management
- Use `pip-tools` for Python dependency pinning
- Use `npm ci` for Node.js reproducible installs
- Implement dependency update automation (Dependabot)

### 2. Regular Audits
- Weekly: `pip-audit` and `npm audit`
- Monthly: Full dependency review
- Quarterly: Major version updates

### 3. Documentation
- Document why each package is needed
- Create DEPENDENCIES.md with rationale
- Update when packages are added/removed

### 4. CI/CD Integration
- Add security scanning to CI pipeline
- Fail builds on critical vulnerabilities
- Automate dependency updates

---

## References

- [pip-audit](https://github.com/pypa/pip-audit)
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Safety](https://safety.readthedocs.io/)
- [Dependabot](https://dependabot.com/)

---

## Notes

- All recommendations maintain backward compatibility
- Test thoroughly before deploying to production
- Keep detailed changelog of dependency updates
- Consider performance impact of each update

