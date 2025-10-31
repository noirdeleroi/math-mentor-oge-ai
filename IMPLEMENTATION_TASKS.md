# Device Upload Flow - Individual Implementation Tasks

## Master Checklist

Track your progress through this checklist. Each task has clear acceptance criteria.

---

## PHASE 1: CRITICAL FIXES ⚠️ DO FIRST

### Task 1.1: Implement Robust Scores Coercion

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 30 minutes  
**Difficulty**: Medium  
**File**: `src/pages/PracticeByNumberOgemath.tsx`

#### Description
Replace basic score assignment with robust coercion that handles strings, decimals, and validates bounds.

#### Changes to Make

1. **Find** the section in `handleDevicePhotoCheck` (around line 1354-1376):
   ```typescript
   // Step 4: Process feedback
   if (apiResponse?.feedback) {
     try {
       const feedbackData = JSON.parse(apiResponse.feedback);
       if (feedbackData.review && typeof feedbackData.scores === 'number') {
   ```

2. **Replace** the conditional check and score assignment with:
   ```typescript
   if (apiResponse?.feedback) {
     try {
       const feedbackData = JSON.parse(apiResponse.feedback);
       
       // Robust scores coercion (Step 6)
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
         
         // Continue processing with validated scores
         if (feedbackData.review) {
           setPhotoScores(scores);
           // ... rest of the flow using 'scores' instead of 'feedbackData.scores'
         } else {
           toast.error('Неверный формат ответа API');
           setIsProcessingPhoto(false);
           setOcrProgress("");
           setUploadProgress(0);
           setAnalysisProgress(0);
           return;
         }
       } catch (scoreError) {
         console.error('Score validation error:', scoreError);
         toast.error('Ошибка при обработке баллов. Пожалуйста, попробуйте снова.');
         setIsProcessingPhoto(false);
         setOcrProgress("");
         setUploadProgress(0);
         setAnalysisProgress(0);
         return;
       }
   ```

3. **Update** subsequent references to use `scores` instead of `feedbackData.scores`:
   - Line 1378: Change `const isCorrect = feedbackData.scores > 0;` to `const isCorrect = scores > 0;`
   - Line 1379: Keep `await updateStudentActivity(isCorrect, feedbackData.scores);` (will fix in Phase 2)

#### Acceptance Criteria
- [ ] Code compiles without errors
- [ ] Handles number inputs: `{ scores: 1 }` → 1
- [ ] Handles string inputs: `{ scores: "1.5" }` → 1.5
- [ ] Handles European format: `{ scores: "1,5" }` → 1.5
- [ ] Clamps out of range: `{ scores: "5" }` → 2
- [ ] Shows error for invalid: `{ scores: "abc" }` → error toast & abort
- [ ] isCorrect computed correctly from scores

#### Testing
1. Upload images for problem 20-25
2. Test with mock API responses returning various score formats
3. Verify no console errors
4. Check that UI still shows analysis correctly

---

### Task 1.2: Fix StudentSolutionCard Data Source

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 20 minutes  
**Difficulty**: Easy  
**Files**: `src/components/analysis/StudentSolutionCard.tsx`

#### Description
Change component to fetch OCR from `profiles.telegram_input` instead of `telegram_uploads.extracted_text`.

#### Changes to Make

1. **Open** `StudentSolutionCard.tsx`

2. **Find** the `fetchStudentSolution` effect (lines 23-56)

3. **Replace** the entire supabase query (lines 33-39) from:
   ```typescript
   const { data, error } = await supabase
     .from('telegram_uploads')
     .select('extracted_text')
     .eq('user_id', user.id)
     .order('created_at', { ascending: false })
     .limit(1)
     .single();
   
   if (error) {
     console.error('Error fetching student solution:', error);
     setFetchedSolution("");
   } else {
     setFetchedSolution(data?.extracted_text || "");
   }
   ```

   To:
   ```typescript
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

4. **Optional**: Update placeholder text on line 72 from:
   ```typescript
   <div className="text-sm text-gray-500">Решение из фото ещё обрабатывается…</div>
   ```
   
   To:
   ```typescript
   <div className="text-sm text-gray-500">Решение не обнаружено</div>
   ```

#### Acceptance Criteria
- [ ] Code compiles without errors
- [ ] Component fetches from correct table (`profiles`)
- [ ] Uses correct field name (`telegram_input`)
- [ ] Error handling works
- [ ] Shows correct OCR text when data exists
- [ ] Shows placeholder when no data
- [ ] No console errors

#### Testing
1. Upload images for a device upload test
2. Check StudentSolutionCard after submission
3. Verify it shows the OCR'd text
4. Test with missing data (should show placeholder)

---

## PHASE 2: MISSING FEATURES 🎯 IMPLEMENT NEXT

### Task 2.1: Add Fire-and-Forget Handle-Submission (Step 9)

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 25 minutes  
**Difficulty**: Medium  
**File**: `src/pages/PracticeByNumberOgemath.tsx`

#### Description
Add fire-and-forget call to `handle-submission` function after scores are saved. This updates student mastery asynchronously without blocking UI.

#### Changes to Make

1. **Find** line 1379 in `handleDevicePhotoCheck`:
   ```typescript
   await updateStudentActivity(isCorrect, feedbackData.scores);
   ```

2. **Add** this code immediately after that line:
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
               scores_fipi: scores
             }
           }
         });
       } catch (e) {
         console.error('handle-submission failed (non-blocking):', e);
       }
     })();
   }
   ```

3. **Update** line 1379 to use `scores` instead of `feedbackData.scores`:
   ```typescript
   // Change:
   await updateStudentActivity(isCorrect, feedbackData.scores);
   // To:
   await updateStudentActivity(isCorrect, scores);
   ```

4. **Also update** any other references to `feedbackData.scores` to use `scores` variable

#### Acceptance Criteria
- [ ] Code compiles without errors
- [ ] Function invokes `handle-submission` without waiting
- [ ] Passes all required parameters correctly
- [ ] Errors are logged but don't block UI
- [ ] No console errors during execution
- [ ] Student mastery table is updated after submission

#### Testing
1. Upload images for device upload
2. Check the database's `student_mastery` table
3. Verify it has new row after submission
4. Verify the async call completed (may take 1-2 seconds)
5. Check browser console - should see no errors

---

### Task 2.2: Add Energy Points Award (Step 10)

**Priority**: 🟡 HIGH  
**Estimated Time**: 20 minutes  
**Difficulty**: Easy  
**File**: `src/pages/PracticeByNumberOgemath.tsx`

#### Description
Award energy points to user after device upload submission, matching the logic from `checkAnswer` flow.

#### Changes to Make

1. **Find** the end of the handle-submission fire-and-forget block you just added

2. **Add** this code right after the closing `}` of the handle-submission block:
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

#### Acceptance Criteria
- [ ] Code compiles without errors
- [ ] Fetches current streak correctly
- [ ] Calls `awardEnergyPoints` with correct parameters
- [ ] Errors don't block UI (fire-and-forget)
- [ ] No console errors
- [ ] Energy points appear in user's account

#### Testing
1. Check user's energy points before upload
2. Upload images for device upload
3. Verify energy points increased
4. Check the energy table for new entries
5. Verify streak is applied correctly

---

### Task 2.3: Add Success Toast Message (Step 11)

**Priority**: 🟢 MEDIUM  
**Estimated Time**: 10 minutes  
**Difficulty**: Easy  
**File**: `src/pages/PracticeByNumberOgemath.tsx`

#### Description
Show success toast with scores after device upload completes.

#### Changes to Make

1. **Find** line 1391 in the code after analysis processing:
   ```typescript
   // Clear uploaded images for next question
   setUploadedImages([]);
   ```

2. **Add** this line immediately after:
   ```typescript
   setUploadedImages([]);
   toast.success(`Анализ готов! Баллы: ${scores}/2`);
   ```

#### Acceptance Criteria
- [ ] Code compiles
- [ ] Toast appears after submission completes
- [ ] Shows correct scores
- [ ] No console errors
- [ ] Toast message is readable and properly positioned

#### Testing
1. Upload images for device upload
2. Wait for analysis to complete
3. Verify success toast appears with scores
4. Dismiss toast and continue to next question

---

## PHASE 3: ERROR HANDLING & POLISH 🛡️ FINISH WITH

### Task 3.1: Add Error Toast for updateStudentActivity

**Priority**: 🟡 HIGH  
**Estimated Time**: 10 minutes  
**Difficulty**: Easy  
**File**: `src/pages/PracticeByNumberOgemath.tsx`

#### Description
Currently fails silently if student_activity update fails. Add error notification.

#### Changes to Make

1. **Find** the `updateStudentActivity` function (lines 714-744)

2. **Locate** the error handling block (lines 735-738):
   ```typescript
   if (updateError) {
     console.error('Error updating student_activity:', updateError);
     return;
   }
   ```

3. **Add** toast notification:
   ```typescript
   if (updateError) {
     console.error('Error updating student_activity:', updateError);
     toast.error('Ошибка сохранения результата.');
     return;
   }
   ```

#### Acceptance Criteria
- [ ] Code compiles
- [ ] Error toast appears if update fails
- [ ] User is notified of the problem
- [ ] No console errors

#### Testing
1. Simulate DB error (hard to do without mocking)
2. Or verify toast doesn't appear during normal operation
3. Check that normal flow still works

---

### Task 3.2: Add Robust Attempt Resolution Fallback (Step 1)

**Priority**: 🟡 HIGH  
**Estimated Time**: 25 minutes  
**Difficulty**: Medium  
**File**: `src/pages/PracticeByNumberOgemath.tsx`

#### Description
Add fallback query if `currentAttemptId` is missing. Ensures we always have an attempt before processing photos.

#### Changes to Make

1. **Find** the start of `handleDevicePhotoCheck` function (line 1253)

2. **Add** this safety check right after the initial null checks (around line 1255):
   ```typescript
   // Ensure we have attempt, or find it
   let attemptId = currentAttemptId;
   
   if (!attemptId) {
     // Step 1.2: Fallback - find latest unfinished attempt
     try {
       const { data: latestAttempt, error: latestErr } = await supabase
         .from('student_activity')
         .select('attempt_id')
         .eq('user_id', user.id)
         .eq('question_id', currentQuestion.question_id)
         .eq('finished_or_not', false)
         .order('updated_at', { ascending: false })
         .limit(1)
         .single();
       
       if (latestErr || !latestAttempt) {
         // Step 1.3: No attempt exists
         toast.error('Не удалось зафиксировать попытку. Повторите ещё раз.');
         return;
       }
       
       attemptId = latestAttempt.attempt_id;
     } catch (e) {
       console.error('Error finding attempt:', e);
       toast.error('Не удалось зафиксировать попытку. Повторите ещё раз.');
       return;
     }
   }
   
   // Now we're guaranteed to have attemptId
   ```

3. **Update** the fire-and-forget handle-submission block to use `attemptId` instead of `currentAttemptId`:
   - Line ~1395: Change `const attemptIdForSubmission = currentAttemptId || ...` to just use the `attemptId` we resolved above
   - Simplify to: `const attemptIdForSubmission = attemptId;`

#### Acceptance Criteria
- [ ] Code compiles
- [ ] Queries DB for latest unfinished attempt if currentAttemptId missing
- [ ] Shows error if no attempt found
- [ ] Uses resolved attemptId throughout flow
- [ ] No console errors
- [ ] Normal flow (when attempt exists) works as before

#### Testing
1. Normal case: upload with valid attemptId - should work
2. Edge case: somehow attempt wasn't created - should show error toast
3. Verify no silent failures

---

## VERIFICATION CHECKLIST

After all tasks complete, verify:

### Basic Functionality
- [ ] Device upload UI shows image previews
- [ ] Can upload 1-3 images
- [ ] Progress bars display correctly
- [ ] OCR processing shows progress

### Pipeline Execution
- [ ] `process-device-photos` completes
- [ ] `profiles.telegram_input` gets populated
- [ ] `analyze-photo-solution` completes
- [ ] Scores are validated and clamped

### Data Storage
- [ ] `student_activity` has scores and is_correct
- [ ] `student_activity` is marked finished
- [ ] `student_mastery` updated (check after 1-2 seconds)
- [ ] Energy points awarded
- [ ] Session results recorded

### User Experience
- [ ] Success toast appears with scores
- [ ] StudentSolutionCard shows OCR text
- [ ] AnalysisReviewCard shows analysis
- [ ] Result alert (green/red) appears
- [ ] Can proceed to next question

### Error Handling
- [ ] Invalid scores handled gracefully
- [ ] Missing OCR data shows error
- [ ] Update failures show error toast
- [ ] No silent failures
- [ ] No console errors

### Edge Cases
- [ ] Scores as "1.5" → 1.5
- [ ] Scores as "1,5" → 1.5
- [ ] Scores as "5" → 2 (clamped)
- [ ] Scores as "abc" → error
- [ ] Multiple uploads work correctly

---

## Summary

| Task | Status | Time | 
|------|--------|------|
| 1.1: Robust Scores Coercion | ⏳ Pending | 30 min |
| 1.2: Fix StudentSolutionCard | ⏳ Pending | 20 min |
| 2.1: Fire-and-Forget Submission | ⏳ Pending | 25 min |
| 2.2: Energy Points Award | ⏳ Pending | 20 min |
| 2.3: Success Toast | ⏳ Pending | 10 min |
| 3.1: Error Toast | ⏳ Pending | 10 min |
| 3.2: Attempt Fallback | ⏳ Pending | 25 min |
| **TOTAL** | | **2 hours** |

---

## Need Help?

If you get stuck on any task:
1. Check the current code at the line references
2. Read the comments in the code
3. Compare with similar patterns in the file
4. Review the IMPLEMENTATION_PLAN.md for more details
5. Check test checklist in DEVICE_UPLOAD_ANALYSIS.md
