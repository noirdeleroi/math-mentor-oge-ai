# Device Upload Flow - Detailed Implementation Plan

## Project Overview

Implement the complete **Device Upload Flow** pipeline for OGE Math practice questions (problems 20-25) on the `practice-by-number-ogemath` page. This involves fixing 7 critical gaps and implementing 3 completely missing features.

---

## Implementation Strategy

### Phase 1: Critical Fixes (Must do first)
1. **Robust Scores Coercion** - Fix Step 6 validation
2. **StudentSolutionCard Data Source** - Fix component to read from correct table

### Phase 2: Missing Features (Non-blocking but important)
3. **Fire-and-Forget Mastery Update** - Add Step 9
4. **Energy Points Award** - Add Step 10
5. **Success Toast** - Add Step 11 toast

### Phase 3: Error Handling & Polish
6. **Robust Attempt Resolution** - Improve Step 1 & 8
7. **Error Messages** - Improve error feedback

---

## Detailed Changes Required

### Phase 1: CRITICAL FIXES

#### Change 1.1: Robust Scores Coercion (in `handleDevicePhotoCheck`)

**Location**: `PracticeByNumberOgemath.tsx` lines 1354-1376

**Current Problem**:
```typescript
// Current - NO validation, coercion, or bounds checking
if (feedbackData.review && typeof feedbackData.scores === 'number') {
  setPhotoScores(feedbackData.scores);
  // ...
}
```

**What to Do**:
- Replace the scores assignment with robust coercion logic
- Support both `number` and `string` types
- Handle decimal points and commas (European format)
- Clamp to [0, 2] range
- Validate with `Number.isFinite()`
- Show error if validation fails

**Implementation Details**:
```typescript
// Extract and validate scores
const raw = feedbackData?.scores;
let scoresNum: number;

try {
  if (typeof raw === 'number') {
    scoresNum = raw;
  } else if (typeof raw === 'string') {
    scoresNum = Number(raw.trim().replace(',', '.'));
  } else {
    scoresNum = NaN;
  }

  if (!Number.isFinite(scoresNum)) {
    throw new Error('Неверный формат баллов');
  }

  // Clamp to [0, 2] range
  const scores = Math.max(0, Math.min(2, scoresNum));
  
  // Continue with rest of flow using 'scores'
} catch (e) {
  console.error('Score validation error:', e);
  toast.error('Ошибка при обработке баллов. Пожалуйста, попробуйте снова.');
  setIsProcessingPhoto(false);
  return; // Abort
}
```

**Testing**: Verify with API responses:
- `{ scores: 1 }` → 1
- `{ scores: "1.5" }` → 1.5
- `{ scores: "1,5" }` → 1.5
- `{ scores: "5" }` → 2 (clamped)
- `{ scores: "abc" }` → error toast

---

#### Change 1.2: Fix StudentSolutionCard Data Source

**Location 1**: `StudentSolutionCard.tsx` lines 22-56

**Current Problem**:
```typescript
// Fetches from WRONG table
const { data, error } = await supabase
  .from('telegram_uploads')  // ❌ WRONG
  .select('extracted_text')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

**What to Do**:
- Change to fetch from `profiles.telegram_input`
- This field is populated by the `process-device-photos` edge function
- Simpler query (no ordering needed)
- More reliable for device uploads

**Implementation**:
```typescript
// Fetch from correct table
const { data, error } = await supabase
  .from('profiles')
  .select('telegram_input')
  .eq('user_id', user.id)
  .single();

if (error) {
  console.error('Error fetching student solution:', error);
  setFetchedSolution("");
} else {
  setFetchedSolution(data?.telegram_input || "");
}
```

**Location 2 (Optional)**: Update placeholder text in `StudentSolutionCard.tsx` line 72

**Current**:
```typescript
<div className="text-sm text-gray-500">Решение из фото ещё обрабатывается…</div>
```

**Suggested**:
```typescript
<div className="text-sm text-gray-500">Решение не обнаружено</div>
```

This matches the spec requirement: *"If empty → show placeholder 'Решение не обнаружено'"*

---

### Phase 2: MISSING FEATURES

#### Change 2.1: Fire-and-Forget Handle-Submission (Step 9)

**Location**: `PracticeByNumberOgemath.tsx` - after `updateStudentActivity` call

**Current**: Missing entirely (line 1379)

**What to Do**:
- After Step 8 completes, fire async `handle-submission` function
- Don't wait for it (fire-and-forget pattern)
- Pass submission data including scores and duration
- Only log errors, don't block UI

**Implementation**:
Add this code RIGHT AFTER line 1379 (the `updateStudentActivity` call):

```typescript
// Step 9: Fire-and-forget mastery update
const attemptIdForSubmission = currentAttemptId || 
  (await supabase
    .from('student_activity')
    .select('attempt_id')
    .eq('user_id', user.id)
    .eq('question_id', currentQuestion.question_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  ).data?.attempt_id;

if (attemptIdForSubmission) {
  const durationForSubmission = currentAttemptId && attemptStartTime
    ? (Date.now() - attemptStartTime.getTime()) / 1000
    : 0;

  // Fire-and-forget: don't await, just start the async task
  (async () => {
    try {
      await supabase.functions.invoke('handle-submission', {
        body: {
          course_id: '1',
          submission_data: {
            user_id: user.id,
            question_id: currentQuestion.question_id,
            attempt_id: attemptIdForSubmission,
            finished_or_not: true,
            is_correct: isCorrect,
            duration: durationForSubmission,
            scores_fipi: feedbackData.scores
          }
        }
      });
    } catch (e) {
      console.error('handle-submission failed (non-blocking):', e);
    }
  })();
}
```

**Why Fire-and-Forget?**
- Don't block student from seeing results
- Mastery updates happen in backend
- Errors are logged but UI continues

---

#### Change 2.2: Award Energy Points (Step 10)

**Location**: `PracticeByNumberOgemath.tsx` - after fire-and-forget submission

**Current**: Missing entirely (only exists in `checkAnswer` flow)

**What to Do**:
- Check current streak
- Award energy points using same logic as `checkAnswer`
- Use fire-and-forget pattern (non-blocking)

**Implementation**:
Add this code after the fire-and-forget handle-submission block:

```typescript
// Step 10: Award energy points (non-blocking)
(async () => {
  try {
    const { data: streakData } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .single();
    
    const currentStreak = streakData?.current_streak || 0;
    const { awardEnergyPoints } = await import('@/services/energyPoints');
    await awardEnergyPoints(user.id, 'problem', undefined,
                           'oge_math_fipi_bank', currentStreak);
  } catch (e) {
    console.error('Energy points award failed (non-blocking):', e);
  }
})();
```

**Note**: This should happen for device uploads just like for text answers.

---

#### Change 2.3: Success Toast (Step 11)

**Location**: `PracticeByNumberOgemath.tsx` - in the finalize UI section

**Current**: Missing toast after processing completes

**What to Do**:
- Add success toast showing scores
- Use the coerced/clamped `scores` value
- Show after all steps complete

**Implementation**:
Add this line after all state updates (before finally block):

```typescript
// Around line 1391, after setUploadedImages([])
setUploadedImages([]);

// Add this line:
toast.success(`Анализ готов! Баллы: ${feedbackData.scores}/2`);
```

**Alternative Location**: If scores get coerced, use the final clamped value:

```typescript
toast.success(`Анализ готов! Баллы: ${scores}/2`);
```

---

### Phase 3: ERROR HANDLING & POLISH

#### Change 3.1: Robust Error Handling for `updateStudentActivity`

**Location**: `PracticeByNumberOgemath.tsx` - in error handling

**Current**: Silent failure if update fails (line 735-738)

**What to Do**:
- Add error toast when `updateStudentActivity` fails
- Currently it logs error but doesn't notify user

**Implementation**:
In `updateStudentActivity` function, change lines 735-738 from:

```typescript
// Current - silent failure
if (updateError) {
  console.error('Error updating student_activity:', updateError);
  return;
}
```

To:

```typescript
// With notification
if (updateError) {
  console.error('Error updating student_activity:', updateError);
  toast.error('Ошибка сохранения результата.');
  return;
}
```

---

#### Change 3.2: Robust Attempt Resolution (Step 1 Fallback)

**Location**: `PracticeByNumberOgemath.tsx` - in `handleDevicePhotoCheck`

**Current**: If `currentAttemptId` missing, just uses whatever is in state

**What to Do**:
- Add fallback query for latest unfinished attempt
- Only matters if attempt creation failed earlier

**Implementation**:
At the start of `handleDevicePhotoCheck`, add safety check:

```typescript
// Ensure we have attempt, or find it
let attemptId = currentAttemptId;

if (!attemptId) {
  // Step 1: Fallback - find latest unfinished attempt
  try {
    const { data: latestAttempt } = await supabase
      .from('student_activity')
      .select('attempt_id')
      .eq('user_id', user.id)
      .eq('question_id', currentQuestion.question_id)
      .eq('finished_or_not', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (latestAttempt) {
      attemptId = latestAttempt.attempt_id;
    } else {
      // No attempt exists at all - this shouldn't happen
      toast.error('Не удалось зафиксировать попытку. Повторите ещё раз.');
      setIsProcessingPhoto(false);
      return;
    }
  } catch (e) {
    console.error('Error finding attempt:', e);
    toast.error('Не удалось зафиксировать попытку. Повторите ещё раз.');
    setIsProcessingPhoto(false);
    return;
  }
}
```

Then use `attemptId` throughout instead of relying on state.

---

## Implementation Timeline

### Week 1
- **Day 1**: Implement Phase 1 fixes (Changes 1.1, 1.2)
- **Day 2-3**: Implement Phase 2 features (Changes 2.1, 2.2, 2.3)
- **Day 4**: Testing and bug fixes

### Week 2
- **Day 1**: Implement Phase 3 error handling (Changes 3.1, 3.2)
- **Day 2-3**: Full integration testing
- **Day 4**: Code review and polish
- **Day 5**: Production deployment

---

## Code Dependencies

These implementations depend on:
1. ✅ Supabase client configured
2. ✅ `profiles.telegram_input` field (populated by `process-device-photos`)
3. ✅ `handle-submission` edge function available
4. ✅ `awardEnergyPoints` service available
5. ✅ `user_streaks` table with `current_streak` field
6. ✅ `sonner` toast notifications

All of these are already in the codebase.

---

## Quality Checklist

Before each change:
- [ ] Understand current code flow
- [ ] Write minimal, focused change
- [ ] Test error cases
- [ ] Verify no console errors
- [ ] Check with similar code patterns in codebase
- [ ] Update comments if needed

After all changes:
- [ ] Full pipeline test with device upload
- [ ] Verify scores saved correctly
- [ ] Verify mastery updated
- [ ] Verify energy points awarded
- [ ] Verify StudentSolutionCard shows correct OCR
- [ ] Verify AnalysisReviewCard renders
- [ ] Verify all toasts appear
- [ ] Test failure scenarios

---

## Success Criteria

Implementation is complete when:

1. ✅ **Scores coercion** works with all input formats
2. ✅ **StudentSolutionCard** shows correct OCR from `profiles.telegram_input`
3. ✅ **Mastery table** updated after device upload submission
4. ✅ **Energy points** awarded to user
5. ✅ **Success toast** shows with scores
6. ✅ **All errors** are caught and user sees meaningful messages
7. ✅ **Session results** recorded correctly
8. ✅ **No silent failures** or console errors
9. ✅ **Device upload works** for problems 20-25
10. ✅ **Pipeline matches spec** exactly


