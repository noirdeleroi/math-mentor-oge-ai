# Device-Photo Flow Analysis: Executive Summary

**Date**: October 31, 2025  
**File Analyzed**: `PracticeByNumberOgemath.tsx` (2475 lines)  
**Scope**: FRQ Questions (№20–25) Photo Upload & AI Analysis Flow

---

## 📊 Analysis Overview

### What Was Found
✅ **10 Components Already Implemented**
- Photo upload UI with preview (lines 2010-2069)
- Progress modal with dual progress bars (lines 2435-2470)
- `handleDevicePhotoCheck()` main handler (lines 1355-1623)
- `startAttempt()` attempt creation (lines 424-481)
- `finalizeAttemptWithScore()` scoring logic (lines 488-552)
- `process-device-photos` edge function call
- `analyze-photo-solution` edge function call
- Photo feedback rendering (lines 2162-2197)
- `StudentSolutionCard` and `AnalysisReviewCard` components
- Result alerts and next question buttons

⚠️ **8 Components Incomplete or Missing**
1. `course_id` not passed to `startAttempt()`
2. No `rpc_finalize_attempt` RPC call (critical for DB state)
3. Error handling incomplete (no timeouts, retry logic)
4. `analysisData` state not cleared in reset
5. Possible duplicate card rendering
6. State consistency gaps
7. Progress modal UX could be enhanced
8. Edge cases not fully handled

---

## 🎯 The 5 Critical Issues

### Issue #1: Missing `course_id` Parameter
**Severity**: High | **Location**: Line ~424 in `startAttempt()`

**Problem**: When creating student attempts, `course_id` is not included. This breaks multi-course support and fails to track which course the attempt belongs to.

**Solution**: Add `course_id: '1'` to the insert statement.

```typescript
// Current (WRONG):
.insert({
  user_id: user.id,
  question_id: questionId,
  answer_time_start: new Date().toISOString(),
  // ... missing course_id
})

// Fixed:
.insert({
  user_id: user.id,
  question_id: questionId,
  course_id: '1',  // ← ADD THIS
  answer_time_start: new Date().toISOString(),
  // ...
})
```

---

### Issue #2: Missing RPC Call for Finalization
**Severity**: Critical | **Location**: Line ~1524 in `handleDevicePhotoCheck()`

**Problem**: The flow calls `finalizeAttemptWithScore()` which directly updates the database. This should be replaced with a call to `rpc_finalize_attempt` edge function for atomic transactions and proper server-side handling.

**Current**: Direct DB update via `finalizeAttemptWithScore()`  
**Required**: RPC call to `rpc_finalize_attempt`

**Why it matters**: 
- RPC ensures atomicity (all-or-nothing)
- Server-side logic is more reliable
- Supports rollback on error
- Proper audit trail

**Solution**: Add RPC invocation after score parsing, before mastery update.

```typescript
// After line 1500 (score clamping), add:
const { data: finalizeResult, error: finalizeError } = await supabase.functions.invoke(
  'rpc_finalize_attempt',
  {
    body: {
      user_id: user.id,
      question_id: currentQuestion.question_id,
      attempt_id: attemptId,
      is_correct: isCorrect,
      scores_fipi: scores,
      course_id: '1'
    }
  }
);

if (finalizeError) {
  console.error('RPC finalize error:', finalizeError);
  toast.error('Ошибка при сохранении результата');
  return;
}

// Continue with mastery update...
```

---

### Issue #3: Missing State Cleanup
**Severity**: Medium | **Location**: Line ~307 in `resetQuestionState()`

**Problem**: When resetting state for the next question, `analysisData` is not cleared. This could cause stale data to persist.

**Current**:
```typescript
setPhotoFeedback("");
setPhotoScores(null);
setStructuredPhotoFeedback(null);
// ✗ Missing: setAnalysisData(null)
```

**Solution**: Add `setAnalysisData(null)` to the reset function.

```typescript
const resetQuestionState = () => {
  setUserAnswer("");
  setIsAnswered(false);
  setIsCorrect(false);
  setShowSolution(false);
  setSolutionViewedBeforeAnswer(false);
  setCurrentAttemptId(null);
  setAttemptStartTime(null);
  setUploadedImages([]);
  setPhotoFeedback("");
  setPhotoScores(null);
  setStructuredPhotoFeedback(null);
  setAnalysisData(null);  // ← ADD THIS
  setOcrProgress("");
  setIsPollingForAnalysis(false);
  setPollingStartTime(null);
};
```

---

### Issue #4: Possible Duplicate Card Rendering
**Severity**: Medium | **Location**: Lines 2106-2112 AND 2162-2197

**Problem**: Feedback cards appear to be rendered in two places:
1. In "Answer Result" section (lines 2106-2112)
2. In "Photo Feedback" section (lines 2162-2197)

This could show duplicate cards.

**Current Architecture**:
```
Answer Result Alert
  ├─ Grid with StudentSolutionCard
  └─ Grid with AnalysisReviewCard (if analysisData exists)

[SEPARATOR]

Photo Feedback Card
  └─ Grid with StudentSolutionCard
  └─ Grid with AnalysisReviewCard
```

**Solution**: Consolidate into single "Обратная связь по решению" section. Choose one rendering location.

**Recommendation**: Keep only the "Photo Feedback" section (lines 2162-2197) as it's more comprehensive, or add conditional logic to prevent double-rendering.

---

### Issue #5: Incomplete Error Handling
**Severity**: Medium | **Location**: `handleDevicePhotoCheck()` entire function (lines 1355-1623)

**Gaps Identified**:
- ✗ No timeout handling for API calls (could hang indefinitely)
- ✗ No retry mechanism (user must start over)
- ✗ Generic error messages (not helpful)
- ✗ Progress state reset might be missed on some error paths
- ✗ No handling for network disconnection mid-flow

**Example: Missing Timeout**
```typescript
// Current: No timeout
const { data: apiResponse, error: apiError } = await supabase.functions.invoke('analyze-photo-solution', {
  body: { ... }
});

// Fixed: Add timeout
const analysisPromise = supabase.functions.invoke('analyze-photo-solution', { body: { ... } });
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Analysis timeout (30s)')), 30000)
);

try {
  const { data: apiResponse } = await Promise.race([analysisPromise, timeoutPromise]);
} catch (error) {
  if (error.message.includes('timeout')) {
    toast.error('Анализ занял слишком долго. Попробуйте ещё раз.');
  }
  // ...
}
```

---

## 📋 Implementation Tasks

### 17 Total Tasks Across 7 Phases

**Phase 1: Foundational Issues** (4 tasks)
- Task 1.1: Add `course_id` to `startAttempt()`
- Task 1.2: Add `rpc_finalize_attempt` RPC call
- Task 1.3: Improve error handling
- Task 1.4: Add `analysisData` to state reset

**Phase 2: Photo Processing** (3 tasks)
- Task 2.1: Polish progress modal messages
- Task 2.2: Verify post-analysis data fetching
- Task 2.3: Validate score format

**Phase 3: Rewards Flow** (3 tasks)
- Task 3.1: Verify mastery update
- Task 3.2: Verify energy points logic
- Task 3.3: Toast message polish

**Phase 4: UI/UX Polish** (3 tasks)
- Task 4.1: Verify feedback cards logic
- Task 4.2: Clean up duplicate rendering
- Task 4.3: Fix result alert logic

**Phase 5: Next Question** (2 tasks)
- Task 5.1: Verify button behavior
- Task 5.2: Review `nextQuestion()` implementation

**Phase 6: Edge Cases** (4 tasks)
- Task 6.1: Handle missing attempt row
- Task 6.2: Ensure RPC idempotency
- Task 6.3: Prevent duplicate submissions
- Task 6.4: Handle page refresh mid-flow

**Phase 7: Testing** (2 tasks)
- Task 7.1: Manual testing checklist
- Task 7.2: Code review checklist

---

## ✅ What Works Well

1. **Photo Upload UI** - Clean, intuitive interface with preview
2. **Progress Modal** - Good visual feedback with progress bars
3. **Component Design** - `StudentSolutionCard` and `AnalysisReviewCard` handle multiple data formats gracefully
4. **Attempt Tracking** - Good fallback logic for finding unfinished attempts
5. **Non-Blocking Rewards** - Mastery/energy points don't block main flow
6. **State Management** - Generally consistent, some gaps

---

## ⚠️ Key Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Missing `course_id` | Data integrity for multi-course | Add to startAttempt() immediately |
| No RPC finalization | DB state inconsistency | Implement rpc_finalize_attempt |
| Stale `analysisData` | Next question shows old feedback | Add to resetQuestionState() |
| Duplicate cards | Confusing UX, wasted space | Consolidate rendering |
| No timeout handling | Hung UI if API slow | Add 30s timeout |
| Network failures | Silent failures | Improve error messages |

---

## 🚀 Quick Start Checklist

**Before Implementation**:
- [ ] Read `DEVICE_PHOTO_FLOW_SUMMARY.md` (quick reference)
- [ ] Read `IMPLEMENTATION_TASKS.md` (detailed tasks)
- [ ] Confirm `rpc_finalize_attempt` edge function exists
- [ ] Backup current code

**Implementation Order**:
1. Task 1.1 - Add course_id (5 min)
2. Task 1.2 - Add RPC call (10 min)
3. Task 1.4 - Fix state reset (2 min)
4. Task 1.3 - Error handling (20 min)
5. Task 4.2 - Fix duplicate cards (5 min)
6. Task 7.1 - Manual testing (30 min)

**Expected Time**: ~2 hours for all critical fixes

---

## 📁 Documentation Files

1. **`IMPLEMENTATION_TASKS.md`** - Detailed task-by-task implementation plan with code snippets
2. **`DEVICE_PHOTO_FLOW_SUMMARY.md`** - Quick reference guide with file locations and flow diagrams
3. **`ANALYSIS_SUMMARY.md`** - This file (executive summary)

---

## 🎯 Success Criteria

✅ **Implementation is complete when:**
- [ ] All 5 critical issues fixed
- [ ] 17 tasks completed (or consciously skipped with justification)
- [ ] No TypeScript errors
- [ ] Manual testing passes all 13 scenarios
- [ ] Network testing passes (timeout, error handling, etc.)
- [ ] No orphaned data or state leaks
- [ ] Code review checklist passed

---

## 📞 Questions?

Refer to:
- **"How does the current flow work?"** → `DEVICE_PHOTO_FLOW_SUMMARY.md` - Flow Diagram section
- **"What's the exact fix for issue X?"** → `DEVICE_PHOTO_FLOW_SUMMARY.md` - 5 Critical Issues section
- **"How do I implement task Y?"** → `IMPLEMENTATION_TASKS.md` - Search for "Task Y"
- **"What should I test?"** → `DEVICE_PHOTO_FLOW_SUMMARY.md` - Verification Checklist section

