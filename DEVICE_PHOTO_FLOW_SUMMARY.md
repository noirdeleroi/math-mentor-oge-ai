# Device-Photo Flow: Implementation Quick Reference

## 📍 File Locations

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Main Handler | `PracticeByNumberOgemath.tsx` | ~1355-1623 | `handleDevicePhotoCheck()` |
| Attempt Creation | `PracticeByNumberOgemath.tsx` | ~424-481 | `startAttempt()` |
| Attempt Finalize | `PracticeByNumberOgemath.tsx` | ~488-552 | `finalizeAttemptWithScore()` |
| State Reset | `PracticeByNumberOgemath.tsx` | ~307-322 | `resetQuestionState()` |
| Progress Modal | `PracticeByNumberOgemath.tsx` | ~2435-2470 | Modal UI |
| Feedback Cards | `PracticeByNumberOgemath.tsx` | ~2162-2197 | Photo feedback section |
| Student Card | `StudentSolutionCard.tsx` | ~1-78 | Shows OCR'd solution |
| Analysis Card | `AnalysisReviewCard.tsx` | ~1-252 | Shows AI feedback |

## 🔄 Flow Diagram

```
User clicks "Проверить" with uploadedImages[]
        ↓
handleDevicePhotoCheck() starts
        ↓
[STEP 1] Ensure attemptId exists (fallback to find latest unfinished)
        ↓
[STEP 2] Call process-device-photos edge function
        ↓ (upload bar animates 0→100%)
        ↓
[STEP 3] Read profiles.telegram_input (OCR'd HTML stored)
        ↓
[STEP 4] Call analyze-photo-solution edge function
        ↓ (analysis bar animates 0→100%)
        ↓
[STEP 5] Parse feedback: { scores: 0-2, review: "<p>...</p>" }
        ↓
[STEP 6] Call rpc_finalize_attempt (⚠️ NOT IMPLEMENTED YET)
        ↓
[STEP 7] Call handle-submission (mastery) - non-blocking
        ↓
[STEP 8] Award energy points & streak - non-blocking
        ↓
Close modal, show success toast, render feedback cards
        ↓
setIsAnswered(true), setIsCorrect(isCorrect)
        ↓
Next Question button appears
        ↓
On click: nextQuestion() → resetQuestionState() → startAttempt(nextQ)
```

## 🔴 Critical Issues to Fix

### Issue #1: Missing `course_id` in Attempt Creation
**Where:** `startAttempt()` ~line 424  
**Current:** Doesn't include `course_id`  
**Fix:** Add `course_id: '1'` to insert

```typescript
// BEFORE
.insert({
  user_id: user.id,
  question_id: questionId,
  answer_time_start: new Date().toISOString(),
  finished_or_not: false,
  // ...
})

// AFTER
.insert({
  user_id: user.id,
  question_id: questionId,
  course_id: '1',  // ← ADD THIS
  answer_time_start: new Date().toISOString(),
  finished_or_not: false,
  // ...
})
```

### Issue #2: Missing `rpc_finalize_attempt` Call
**Where:** `handleDevicePhotoCheck()` ~line 1524  
**Current:** Uses `finalizeAttemptWithScore()` (direct DB update)  
**Fix:** Replace with RPC call

```typescript
// ADD AFTER score validation (before mastery update)
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
  console.error('Error finalizing attempt:', finalizeError);
  toast.error('Ошибка при сохранении результата');
  return;
}
```

### Issue #3: Missing `analysisData` in State Reset
**Where:** `resetQuestionState()` ~line 307  
**Current:** Clears `photoFeedback` but not `analysisData`  
**Fix:** Add `setAnalysisData(null)`

```typescript
// ADD to resetQuestionState()
setAnalysisData(null);  // ← ADD THIS
```

### Issue #4: Possible Duplicate Card Rendering
**Where:** Lines ~2106-2112 AND ~2162-2197  
**Issue:** Cards might render twice  
**Fix:** Check if both sections should exist or consolidate

```typescript
// Line ~2106-2112: In "Answer Result" section
{currentQuestion.problem_number_type >= 20 && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <StudentSolutionCard />
    {analysisData && <AnalysisReviewCard analysisData={analysisData} />}
  </div>
)}

// Line ~2162-2197: In "Photo Feedback" section
{(photoFeedback || analysisData) && (
  <Card>
    {/* Another StudentSolutionCard & AnalysisReviewCard */}
  </Card>
)}

// DECISION: Keep only the "Photo Feedback" section (2162-2197)
//           Remove or conditional check the "Answer Result" cards (2106-2112)
```

### Issue #5: Error Handling Incomplete
**Where:** `handleDevicePhotoCheck()` entire function  
**Gaps:**
- No timeout handling for analysis API
- No retry mechanism
- Some error messages are generic
- Progress state might not reset on all error paths

**Fix:** Add detailed error cases

```typescript
// Add timeout handling
const analysisTimeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Analysis timeout')), 30000)
);

try {
  const { data: apiResponse } = await Promise.race([
    supabase.functions.invoke('analyze-photo-solution', { ... }),
    analysisTimeout
  ]);
} catch (error) {
  if (error.message === 'Analysis timeout') {
    toast.error('Время анализа истекло. Попробуйте ещё раз.');
  }
  // ...
}
```

## ✅ Verification Checklist

### Before Testing
- [ ] All 5 critical issues are fixed
- [ ] No TypeScript errors in `PracticeByNumberOgemath.tsx`
- [ ] `rpc_finalize_attempt` edge function exists and is deployed
- [ ] `profiles.telegram_input` column exists in DB
- [ ] `photo_analysis_outputs` table exists (if using)

### Manual Testing
- [ ] Upload 1, 2, 3 images for question 20-25 (test each count)
- [ ] Progress modal appears and animates
- [ ] Wait for analysis to complete
- [ ] Verify feedback cards show OCR'd solution and AI analysis
- [ ] Check `student_activity` table: attempt is `finished_or_not=true` with score
- [ ] Check `user_streaks` or mastery table updated
- [ ] Check energy points awarded (DB or UI animation)
- [ ] Click "Next Question" and verify state resets
- [ ] Upload more photos for question 2 (verify clean state)
- [ ] Test error case: kill network, try upload, see error message
- [ ] Test with questions 1-19 (should NOT show photo UI)

### Network Testing
- [ ] Slow upload (>5 seconds) - progress bar smooth
- [ ] Slow analysis (>10 seconds) - modal doesn't freeze
- [ ] Analysis times out - friendly error, not crash
- [ ] Analysis fails with API error - error message clear
- [ ] User navigates away during processing - cleanup happens

## 📊 Data Flow

```
Frontend (handleDevicePhotoCheck)
  ├─→ process-device-photos (edge fn)
  │   ├─→ Save to telegram_uploads table
  │   └─→ Save OCR'd HTML to profiles.telegram_input
  │
  ├─→ analyze-photo-solution (edge fn)
  │   ├─→ Read profiles.telegram_input
  │   └─→ Return { feedback: JSON.stringify({ scores, review }) }
  │
  ├─→ rpc_finalize_attempt (edge fn) ← ⚠️ NEW
  │   └─→ Update student_activity: finished_or_not=true, scores_fipi, duration
  │
  ├─→ handle-submission (edge fn) [non-blocking]
  │   └─→ Update mastery/skills data
  │
  └─→ awardEnergyPoints (local service) [non-blocking]
      └─→ Update user_energy_points

UI Rendering:
  ├─→ StudentSolutionCard auto-fetches profiles.telegram_input
  ├─→ AnalysisReviewCard receives analysisData prop
  └─→ Both render in grid (lg:grid-cols-2)
```

## 🛠️ Implementation Checklist (in order)

- [ ] **Task 1.1** Fix `startAttempt()` - add `course_id`
- [ ] **Task 1.2** Fix `handleDevicePhotoCheck()` - add `rpc_finalize_attempt` call
- [ ] **Task 1.3** Improve error handling - timeout, retry, messages
- [ ] **Task 1.4** Fix state reset - add `setAnalysisData(null)`
- [ ] **Task 2.1** Polish progress modal - dynamic messages
- [ ] **Task 3.1-3.3** Verify mastery/energy/toast
- [ ] **Task 4.1-4.3** Polish feedback cards - check duplicate rendering
- [ ] **Task 5.1-5.2** Verify next question flow
- [ ] **Task 6.1-6.4** Add edge case handling
- [ ] **Task 7.1-7.2** Manual testing & code review

## 🔗 Related Files

- `StudentSolutionCard.tsx` - Reads `profiles.telegram_input`
- `AnalysisReviewCard.tsx` - Displays feedback with score badge
- `process-device-photos` edge fn - OCRs images
- `analyze-photo-solution` edge fn - AI analysis
- `rpc_finalize_attempt` edge fn - ⚠️ Must be created/deployed
- `handle-submission` edge fn - Mastery update
- `awardEnergyPoints` service - Energy points




