

## Device-Photo Flow Implementation Plan for FRQ Questions (№20–25)

### Overview
The goal is to implement a complete **device-photo flow** for FRQ (free-response) questions (problem numbers 20–25) in `PracticeByNumberOgemath.tsx`. This flow allows students to upload photos of their handwritten solutions, which are OCR'd and analyzed by AI.

### Current State Analysis

**✅ Already Implemented:**
1. Photo upload UI (from device with preview and removal)
2. `uploadedImages` state and preview handling
3. `handleDevicePhotoCheck()` function with photo processing
4. Progress modal with two progress bars (upload + analysis)
5. `startAttempt()` function to create attempt in `student_activity`
6. `finalizeAttemptWithScore()` to update attempt with score
7. `process-device-photos` edge function call
8. `analyze-photo-solution` edge function call
9. `StudentSolutionCard` and `AnalysisReviewCard` components
10. Photo feedback section rendering

**❌ Missing or Incomplete:**

1. **Precondition Step**: No `course_id` parameter in `startAttempt()` call
2. **RPC Call**: Missing `rpc_finalize_attempt` edge function call (currently using direct DB update)
3. **Mastery Update**: `handle-submission` is called but could be more robust
4. **Streak/Energy Logic**: Basic implementation exists but needs review
5. **Error Handling**: Some edge cases not fully addressed
6. **State Management**: `analysisData` state not always properly initialized/cleared
7. **UI/UX Polish**: Progress modal could show more detailed messages
8. **Course Awareness**: `course_id` hardcoded as `'1'` without context validation

---

### Task List

#### Phase 1: Fix Foundational Issues

**Task 1.1: Add Course ID to Attempt Creation**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `startAttempt()` function (line ~424)
- **Changes**:
  - Add `course_id` parameter to the `student_activity` insert (currently not included)
  - Default to `'1'` if not available
  - Document that this ensures multi-course future-proofing
- **Status**: PENDING

**Task 1.2: Implement `rpc_finalize_attempt` Call**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `handleDevicePhotoCheck()` function (line ~1524)
- **Changes**:
  - Replace or supplement `finalizeAttemptWithScore()` with `rpc_finalize_attempt` edge function call
  - Call structure:
    ```ts
    const { data: finalizeResult, error: finalizeError } = await supabase.functions.invoke('rpc_finalize_attempt', {
      body: {
        user_id: user.id,
        question_id: currentQuestion.question_id,
        attempt_id: attemptId,
        is_correct: isCorrect,
        scores_fipi: scores,
        course_id: '1'
      }
    });
    ```
  - Place this call immediately after parsing feedback and before mastery/streak logic
  - Add error handling with retry logic or graceful fallback
- **Status**: PENDING

**Task 1.3: Improve Error Handling in `handleDevicePhotoCheck()`**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `handleDevicePhotoCheck()` function (line ~1355-1623)
- **Changes**:
  - Add specific handling for timeout scenarios in `analyze-photo-solution`
  - Implement retry logic (optional: show "Retry" button if analysis fails)
  - Add clear error messages for each step (upload, OCR, analysis)
  - Ensure `isProcessingPhoto` is properly reset on all error paths
  - Add logging for debugging
- **Status**: PENDING

**Task 1.4: Ensure Attempt State Consistency**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Multiple (state initialization and reset)
- **Changes**:
  - Verify `analysisData` is properly cleared in `resetQuestionState()`
  - Add `analysisData` to state reset (currently has `photoFeedback` but verify it's sufficient)
  - Ensure `currentAttemptId` and `attemptStartTime` are set before entering photo flow
- **Status**: PENDING

---

#### Phase 2: Enhance Photo Processing Flow

**Task 2.1: Improve Progress Modal UX**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Progress dialog (line ~2435-2470)
- **Changes**:
  - Add dynamic progress messages (e.g., "Загрузка фото 1 из 3...", "Распознавание текста...", "AI анализирует решение...")
  - Show OCR progress text from `ocrProgress` state (already implemented but verify it displays)
  - Add spinner/animation for loading state
  - Ensure dialog cannot be closed during processing (already has `onOpenChange={() => {}}`)
- **Status**: PENDING

**Task 2.2: Add Post-Analysis Data Fetching**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: After `analyze-photo-solution` call (line ~1578-1582)
- **Changes**:
  - Implement `fetchAnalysisData()` function to read `photo_analysis_outputs` table if needed
  - Currently it's called but check if function is actually defined
  - Alternative: store analysis data directly from API response instead of fetching
  - Consider caching to avoid duplicate reads
- **Status**: PENDING

**Task 2.3: Validate Score Format and Bounds**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Score processing section (line ~1493-1500)
- **Changes**:
  - Verify `toNumberOrNull()` function handles all edge cases
  - Ensure score is clamped to [0, 2] range (already done)
  - Add validation that score is integer (not float)
  - Log warnings for unexpected score values
- **Status**: PENDING

---

#### Phase 3: Finalization & Rewards Flow

**Task 3.1: Robust Mastery Update with Fallback**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `handle-submission` call (line ~1535-1554)
- **Changes**:
  - Ensure `handle-submission` receives correct `duration` value
  - Add error handling but keep it non-blocking (already done)
  - Log any failures for debugging
  - Consider adding retry mechanism (optional)
- **Status**: PENDING

**Task 3.2: Verify Energy Points Logic**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Energy points section (line ~1557-1573)
- **Changes**:
  - Confirm streak calculation and energy points award logic
  - Verify `awardEnergyPoints` function exists and works correctly
  - Check if energy points trigger UI animation (mentioned in spec)
  - Add error logging
- **Status**: PENDING

**Task 3.3: Toast Success Message**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Line ~1586
- **Changes**:
  - Verify toast message is clear and user-friendly
  - Consider adding emoji or icon for visual appeal
  - Ensure toast displays even if background tasks fail
- **Status**: PENDING

---

#### Phase 4: UI/UX and Card Integration

**Task 4.1: Verify Feedback Cards Display Logic**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Feedback cards section (line ~2162-2197)
- **Changes**:
  - Ensure `StudentSolutionCard` auto-fetches from `profiles.telegram_input`
  - Verify `AnalysisReviewCard` correctly handles both new (simple) and old (structured) formats
  - Check that both cards display properly in grid layout (lg:grid-cols-2)
  - Verify cards are only shown for questions 20-25 AND when `isAnswered === true`
- **Status**: PENDING

**Task 4.2: Clean Up Duplicate Card Rendering**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Multiple locations (lines ~2106-2112 and ~2162-2197)
- **Changes**:
  - Check if there's duplication in card rendering
  - Consider if both "Answer Result" section cards (line 2106-2112) and "Photo Feedback" section cards (line 2173-2197) should both exist
  - Per spec: prefer a single section titled "Обратная связь по решению" with both cards
  - Remove or consolidate duplicate renderings
- **Status**: PENDING

**Task 4.3: Ensure Result Alert Logic**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: Answer result alert (line ~2081-2102)
- **Changes**:
  - Verify alert shows green if `isCorrect === true`, red otherwise
  - Ensure alert message is appropriate (spec mentions correct vs. incorrect messages)
  - Check that for photo submissions, alert doesn't show duplicate "Правильный ответ" (since AI feedback is shown in cards)
- **Status**: PENDING

---

#### Phase 5: Next Question Flow

**Task 5.1: Verify Next Question Button Behavior**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: "Следующий вопрос" button (line ~2138-2142)
- **Changes**:
  - Confirm button calls `nextQuestion()`
  - Verify `nextQuestion()` increments index and calls `resetQuestionState()`
  - Ensure `startAttempt()` is called IMMEDIATELY after reset for next question
  - Check that state is properly cleared (uploaded images, feedback, etc.)
- **Status**: PENDING

**Task 5.2: Review `nextQuestion()` Implementation**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `nextQuestion()` function (search for definition)
- **Changes**:
  - Ensure it resets all UI state
  - Call `startAttempt()` for the new question
  - Clear `uploadedImages` array
  - Verify scroll to top or focus management
- **Status**: PENDING

---

#### Phase 6: Edge Cases & Safeguards

**Task 6.1: Handle Missing Attempt Row**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `handleDevicePhotoCheck()` (line ~1359-1387)
- **Changes**:
  - Currently falls back to finding latest unfinished attempt
  - Add better error message if no attempt found
  - Consider creating minimal attempt as final fallback
  - Log this scenario for monitoring
- **Status**: PENDING

**Task 6.2: Idempotency for `rpc_finalize_attempt`**
- **File**: Edge function definition (if accessible)
- **Location**: Backend RPC implementation
- **Changes**:
  - Ensure RPC is idempotent (same call twice = same result)
  - Document behavior for already-finalized attempts
  - Ensure frontend treats any non-error response as success
- **Status**: PENDING (dependent on backend team)

**Task 6.3: Handle Duplicate Submissions**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `handleDevicePhotoCheck()` entry
- **Changes**:
  - Add guard to prevent submitting the same photo twice in quick succession
  - Disable "Проверить" button during processing (already done)
  - Consider debounce mechanism
- **Status**: PENDING

**Task 6.4: Refresh Handling**
- **File**: `PracticeByNumberOgemath.tsx`
- **Location**: `handleDevicePhotoCheck()` (line ~1359-1387)
- **Changes**:
  - Current fallback handles missing `currentAttemptId` well
  - Verify it works if user refreshes mid-flow
  - Ensure no orphaned attempts are created
- **Status**: PENDING

---

#### Phase 7: Testing & Validation

**Task 7.1: Manual Testing Checklist**
- **What to Test**:
  - [ ] Upload 1-3 images for question 20-25
  - [ ] Verify progress modal shows and animates
  - [ ] Check OCR text is stored in `profiles.telegram_input`
  - [ ] Verify AI analysis completes and score is 0-2
  - [ ] Confirm feedback cards render correctly
  - [ ] Verify `student_activity` is finalized with duration and score
  - [ ] Check mastery/streak/energy points are awarded (check DB or logs)
  - [ ] Test "Next Question" button works
  - [ ] Verify state is reset for next question
  - [ ] Test with network timeout (analyze-photo-solution fails)
  - [ ] Test with missing attempt
  - [ ] Test refresh during flow
  - [ ] Test with non-question-20-25 types (should not show photo UI)
- **Status**: PENDING

**Task 7.2: Code Review Checklist**
- **Review Items**:
  - [ ] All edge function calls have error handling
  - [ ] State consistency throughout flow
  - [ ] No memory leaks (intervals cleared, state cleaned)
  - [ ] Proper TypeScript types
  - [ ] Console.error logs added for debugging
  - [ ] Toast messages are user-friendly
  - [ ] Modal is non-dismissable during processing
- **Status**: PENDING

---

### Implementation Order (Recommended)

1. **Task 1.1** - Add course_id (foundational)
2. **Task 1.2** - Add rpc_finalize_attempt call (important for correct DB state)
3. **Task 1.3** - Improve error handling (robustness)
4. **Task 1.4** - Ensure state consistency (stability)
5. **Task 2.1** - Improve progress modal UX (user experience)
6. **Task 2.2** - Add post-analysis data fetching if needed (data completeness)
7. **Task 3.1-3.3** - Verify mastery/energy/toast (rewards flow)
8. **Task 4.1-4.3** - Polish UI/UX (presentation)
9. **Task 5.1-5.2** - Verify next question flow (completeness)
10. **Task 6.1-6.4** - Edge cases (robustness)
11. **Task 7.1-7.2** - Testing (quality)

### Notes

- **Course ID**: Currently hardcoded as `'1'` throughout. Should be dynamic if multi-course support is planned.
- **Attempt ID**: Properly handled with fallback logic; good design.
- **Analysis Data Storage**: Unclear if `photo_analysis_outputs` table is used; currently data comes from API response only.
- **Component Integration**: `StudentSolutionCard` and `AnalysisReviewCard` are well-designed and handle multiple data formats.
- **State Management**: Could benefit from a context or reducer for photo flow state (optional optimization).

### Success Criteria

✅ **Perfect device-photo flow achieved when:**
- All 8 steps (from spec) execute without errors
- Progress modal shows and animates smoothly
- Feedback cards display OCR'd solution and AI analysis
- Attempt is properly finalized in DB
- Mastery/streak/energy points are awarded
- Toast shows success message
- Next question works and state resets
- All edge cases are handled gracefully
- No orphaned data or state leaks