# Global Refactoring Plan - ATLAS v5.0

**Date**: November 14, 2025  
**Status**: 🟢 **IN PROGRESS**

---

## Phase 1: Analysis & Audit (Current)

### 1.1 Identified Issues

#### Duplicate Code
- [ ] Tool name normalization logic duplicated in 3+ files
  - `tool-name-normalizer.js` (centralized)
  - `schema-validator.js` (lines 77-91)
  - `mcp-sync-validator.js` (lines 80-102)
  - `format-validator.js` (lines 138-160)

- [ ] Rate limiting logic duplicated
  - `api-rate-limiter.js`
  - `intelligent-rate-limiter.js`
  - `unified-rate-limiter.js`
  - `adaptive-request-throttler.js`

- [ ] Error handling patterns repeated
- [ ] Validation logic scattered across files
- [ ] Statistics tracking duplicated
- [ ] Queue management logic repeated

#### Missing Consolidation
- [ ] No unified error handling
- [ ] No centralized configuration
- [ ] No shared utilities for common patterns
- [ ] No consistent logging format

#### Performance Issues
- [ ] Multiple rate limiters competing
- [ ] Duplicate validation passes
- [ ] Redundant tool name conversions
- [ ] Inefficient queue management

---

## Phase 2: Consolidation (Days 1-2)

### 2.1 Tool Name Normalization
**Goal**: Single source of truth for tool name handling

**Actions**:
- [ ] Audit all tool name usage
- [ ] Consolidate to `tool-name-normalizer.js`
- [ ] Update `schema-validator.js` to use normalizer
- [ ] Update `mcp-sync-validator.js` to use normalizer
- [ ] Update `format-validator.js` to use normalizer
- [ ] Add tests for all formats

**Files to Modify**:
- `/orchestrator/utils/tool-name-normalizer.js` (enhance)
- `/orchestrator/ai/validation/schema-validator.js` (refactor)
- `/orchestrator/ai/validation/mcp-sync-validator.js` (refactor)
- `/orchestrator/ai/validation/format-validator.js` (refactor)

### 2.2 Rate Limiting Consolidation
**Goal**: Single unified rate limiter

**Actions**:
- [ ] Analyze all 4 rate limiters
- [ ] Consolidate to `adaptive-request-throttler.js`
- [ ] Remove `api-rate-limiter.js`
- [ ] Remove `intelligent-rate-limiter.js`
- [ ] Remove `unified-rate-limiter.js`
- [ ] Update all imports

**Files to Modify**:
- `/orchestrator/utils/adaptive-request-throttler.js` (enhance)
- `/orchestrator/utils/api-rate-limiter.js` (DELETE)
- `/orchestrator/utils/intelligent-rate-limiter.js` (DELETE)
- `/orchestrator/utils/unified-rate-limiter.js` (DELETE)
- All files importing these (update imports)

### 2.3 Error Handling Consolidation
**Goal**: Unified error handling system

**Actions**:
- [ ] Create `error-handler.js` with all error types
- [ ] Create `error-utils.js` with helper functions
- [ ] Consolidate error handling patterns
- [ ] Update all error throws

**Files to Create**:
- `/orchestrator/utils/error-handler.js` (new)
- `/orchestrator/utils/error-utils.js` (new)

### 2.4 Validation Consolidation
**Goal**: Single validation pipeline

**Actions**:
- [ ] Consolidate validators
- [ ] Remove duplicate validation logic
- [ ] Create unified validation interface
- [ ] Add validation caching

**Files to Modify**:
- `/orchestrator/ai/validation/` (refactor)

---

## Phase 3: Cleanup (Day 3)

### 3.1 Remove Duplicates
- [ ] Delete redundant files
- [ ] Remove duplicate functions
- [ ] Clean up imports
- [ ] Update documentation

### 3.2 Optimize Performance
- [ ] Add caching where appropriate
- [ ] Remove unnecessary conversions
- [ ] Optimize queue management
- [ ] Profile and measure

### 3.3 Update Tests
- [ ] Update unit tests
- [ ] Update integration tests
- [ ] Add new tests for consolidated code
- [ ] Verify all tests pass

---

## Phase 4: Integration & Testing (Days 4-5)

### 4.1 Integration
- [ ] Integrate consolidated modules
- [ ] Update all imports
- [ ] Verify functionality
- [ ] Fix any issues

### 4.2 Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Load tests

### 4.3 Validation
- [ ] Verify no regressions
- [ ] Check performance improvements
- [ ] Validate error handling
- [ ] Confirm all features work

---

## Phase 5: Documentation (Day 6)

### 5.1 Update Documentation
- [ ] Update API documentation
- [ ] Update integration guides
- [ ] Update troubleshooting guides
- [ ] Add migration guide

### 5.2 Create Runbooks
- [ ] Deployment runbook
- [ ] Troubleshooting runbook
- [ ] Monitoring runbook
- [ ] Rollback runbook

---

## Phase 6: Deployment (Day 7)

### 6.1 Pre-Deployment
- [ ] Final testing
- [ ] Performance validation
- [ ] Security review
- [ ] Backup current state

### 6.2 Deployment
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] Monitor closely

### 6.3 Post-Deployment
- [ ] Verify all systems working
- [ ] Monitor performance
- [ ] Collect metrics
- [ ] Document results

---

## Success Criteria

### Must Have ✅
- [ ] No duplicate code
- [ ] Single rate limiter
- [ ] Unified error handling
- [ ] All tests passing
- [ ] No performance regression

### Should Have 🟡
- [ ] 20% performance improvement
- [ ] Better code organization
- [ ] Improved maintainability
- [ ] Comprehensive documentation

### Nice to Have 🟢
- [ ] 30% performance improvement
- [ ] Automated testing
- [ ] Monitoring dashboard
- [ ] Self-healing capabilities

---

## Files to Delete

1. `/orchestrator/utils/api-rate-limiter.js`
2. `/orchestrator/utils/intelligent-rate-limiter.js`
3. `/orchestrator/utils/unified-rate-limiter.js`
4. Any other duplicate files

---

## Files to Create

1. `/orchestrator/utils/error-handler.js`
2. `/orchestrator/utils/error-utils.js`
3. `/orchestrator/utils/validation-utils.js`
4. `/orchestrator/utils/queue-utils.js`

---

## Files to Modify

### High Priority
1. `/orchestrator/utils/adaptive-request-throttler.js`
2. `/orchestrator/utils/tool-name-normalizer.js`
3. `/orchestrator/ai/validation/schema-validator.js`
4. `/orchestrator/ai/validation/mcp-sync-validator.js`
5. `/orchestrator/ai/validation/format-validator.js`

### Medium Priority
1. `/orchestrator/ai/mcp-manager.js`
2. `/orchestrator/core/service-registry.js`
3. `/orchestrator/workflow/executor-v3.js`

### Low Priority
1. All other files importing deleted modules

---

## Timeline

```
Week 1:
├─ Mon: Analysis & Planning
├─ Tue: Tool Name Consolidation
├─ Wed: Rate Limiter Consolidation
├─ Thu: Error Handling & Validation
└─ Fri: Cleanup & Optimization

Week 2:
├─ Mon: Integration & Testing
├─ Tue: Performance Testing
├─ Wed: Documentation
├─ Thu: Final Validation
└─ Fri: Deployment

Week 3:
├─ Mon-Fri: Monitoring & Optimization
```

---

## Estimated Impact

### Code Quality
- Reduction in duplicate code: 40-50%
- Improvement in maintainability: 60%
- Reduction in bugs: 30-40%

### Performance
- Reduction in API calls: 20-30%
- Improvement in response time: 15-25%
- Reduction in memory usage: 10-20%

### Development
- Faster bug fixes: 50%
- Easier feature additions: 40%
- Better code reviews: 60%

---

## Risk Assessment

### Low Risk
- Tool name consolidation
- Error handling consolidation
- Documentation updates

### Medium Risk
- Rate limiter consolidation
- Validation consolidation
- Import updates

### High Risk
- Deleting old rate limiters
- Changing core logic
- Production deployment

---

## Mitigation Strategies

### For High Risk Items
1. Comprehensive testing before deletion
2. Gradual migration with feature flags
3. Rollback plan ready
4. Monitoring alerts configured
5. Team trained on changes

---

## Next Steps

1. ✅ Create this plan
2. ⏳ Start Phase 1: Analysis
3. ⏳ Proceed with consolidation
4. ⏳ Test thoroughly
5. ⏳ Deploy carefully

---

**Status**: 🟢 **READY TO START**

