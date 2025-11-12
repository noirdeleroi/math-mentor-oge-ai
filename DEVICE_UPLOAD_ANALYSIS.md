# Device Upload Flow (20–25) - Implementation Analysis

## Overview
This document analyzes the **Device Upload Flow** pipeline for OGE Math practice questions (problems 20-25) and identifies what is currently implemented vs. what is missing.

---

## Current Implementation Status

### ✅ IMPLEMENTED

#### 1. **Ensure Attempt Exists** (Step 1)
- **Status**: ✅ PARTIALLY IMPLEMENTED
- **Current Code**: `startAttempt()` function (lines 411-468)
- **What Works**:
  - Creates attempt when question loads
  - Stores `attempt_id` and `attemptStartTime`
  - Fetches question details for skills/topics
- **Issues**:
  - Does NOT implement Step 1.2 (fallback query for latest unfinished attempt)
  - Missing Step 1.3 (error toast if attempt still missing)

#### 2. **Open Progress Modal** (Step 2)
- **Status**: ✅ FULLY IMPLEMENTED
- **Current Code**: Lines 2228-2263 (Progress Dialog with two loading bars)
- **What Works**:
  - Sets `isProcessingPhoto = true`
  - Shows `uploadProgress` and `analysisProgress` bars
  - Displays `ocrProgress` text

#### 3. **OCR Images** (Step 3)
- **Status**: ✅ FULLY IMPLEMENTED
- **Current Code**: `handleDevicePhotoCheck()` lines 1275-1294
- **What Works**:
  - Calls `process-device-photos` edge function
  - Passes `uploadedImages`, `user_id`, `question_id`
  - Handles errors properly
  - Sets `uploadProgress = 100`

#### 4. **Fetch OCR Text** (Step 4)
- **Status**: ✅ FULLY IMPLEMENTED
- **Current Code**: `handleDevicePhotoCheck()` lines 1299-1311
- **What Works**:
  - Reads `profiles.telegram_input`
  - Handles missing/empty error
  - Proper error messages

#### 5. **Analyze** (Step 5)
- **Status**: ✅ FULLY IMPLEMENTED
- **Current Code**: `handleDevicePhotoCheck()` lines 1313-1351
- **What Works**:
  - Animates `analysisProgress` to ~95%
  - Calls `analyze-photo-solution` function
  - Passes all required parameters
  - Shows `retry_message` on error

#### 6. **Parse + Validate** (Step 6)
- **Status**: ⚠️ PARTIALLY IMPLEMENTED
- **Current Code**: `handleDevicePhotoCheck()` lines 1354-1376
- **Issues**:
  - ❌ **MISSING: Robust scores coercion** - No numeric string to number conversion
  - ❌ **MISSING: Support for comma/point decimals** - Only accepts pure numbers
  - ❌ **MISSING: Clamping to [0,2]** - No Math.max/Math.min bounds checking
  - ❌ **MISSING: NaN validation** - No Number.isFinite() check

#### 7. **Compute Grading** (Step 7)
- **Status**: ✅ FULLY IMPLEMENTED
- **Current Code**: Line 1378
- **What Works**: `isCorrect = feedbackData.scores > 0`

#### 8. **Update `student_activity`** (Step 8)
- **Status**: ⚠️ PARTIALLY IMPLEMENTED
- **Current Code**: Line 1379
- **Issues**:
  - ✅ Calls `updateStudentActivity(isCorrect, feedbackData.scores)`
  - ❌ **MISSING: Robust attempt resolution** - Only uses state, no fallback query
  - ✅ Computes `duration_answer`
  - ✅ Updates with scores and finished flag
  - ❌ **MISSING: Error handling** - No error toast on update failure

#### 9. **Fire-and-Forget Mastery Update** (Step 9)
- **Status**: ❌ **NOT IMPLEMENTED**
- **Issues**:
  - No async mastery update after Step 8
  - No `handle-submission` invocation
  - No fire-and-forget pattern
  - Would prevent UI blocking but currently missing entirely

#### 10. **Award Energy Points** (Step 10)
- **Status**: ❌ **NOT IMPLEMENTED**
- **Issues**:
  - No energy points awarded for device upload
  - No streak checking
  - No `awardEnergyPoints` call
  - The check-answer flow has it (lines 643-653), but device upload doesn't

#### 11. **Finalize UI** (Step 11)
- **Status**: ✅ PARTIALLY IMPLEMENTED
- **Current Code**: Lines 1390-1391, 1381-1382
- **What Works**:
  - Sets `analysisProgress = 100`
  - Sets `isProcessingPhoto = false`
  - Sets `ocrProgress = ""`
  - Clears `uploadedImages`
  - Stores analysis data
  - Sets `photoScores`, `isAnswered`, `isCorrect`
- **Issues**:
  - ❌ **MISSING: Toast success message** - No "Анализ готов! Баллы: X/2" toast

#### 12. **Failure Handler** (Step 12)
- **Status**: ✅ MOSTLY IMPLEMENTED
- **Current Code**: Lines 1289-1293, 1346-1350, 1404-1410
- **What Works**:
  - Sets `isProcessingPhoto = false`
  - Clears `ocrProgress`
  - Resets progress bars
  - Shows error toasts
- **Issues**:
  - ✅ Doesn't mark answered (correct behavior)

### ❌ NOT IMPLEMENTED

#### StudentSolutionCard from `profiles.telegram_input`
- **Status**: ⚠️ PARTIALLY IMPLEMENTED
- **Issue**: The `StudentSolutionCard` component (lines 1901, 1968) is shown AFTER answer is marked
- **Problem**: Currently fetches from `telegram_uploads`, not `profiles.telegram_input`
- **Expected**: Should display the OCR'd text from `profiles.telegram_input` (populated by `process-device-photos`)
- **Current Code** (StudentSolutionCard.tsx lines 34-39):
  ```typescript
  const { data, error } = await supabase
    .from('telegram_uploads')
    .select('extracted_text')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  ```

---

## Missing Implementation Details

### Critical Gaps

1. **Robust Scores Coercion (Step 6)**
   ```typescript
   // MISSING - Should handle:
   const raw = parsed?.scores;
   const scoresNum = (typeof raw === 'number') ? raw
                    : (typeof raw === 'string') ?
                      Number(raw.trim().replace(',', '.'))
                    : NaN;
   if (!Number.isFinite(scoresNum)) fail('Неверный формат ответа API');
   const scores = Math.max(0, Math.min(2, scoresNum)); // clamp [0,2]
   ```

2. **Fire-and-Forget Handle-Submission (Step 9)**
   ```typescript
   // COMPLETELY MISSING - Should invoke:
   (async () => {
     try {
       await supabase.functions.invoke('handle-submission', {
         body: {
           course_id: '1',
           submission_data: {
             user_id: user.id,
             question_id: currentQuestion.question_id,
             attempt_id: attemptId,
             finished_or_not: true,
             is_correct: isCorrect,
             duration: duration_answer,
             scores_fipi: scores
           }
         }
       });
     } catch (e) {
       console.error('handle-submission failed (non-blocking):', e);
     }
   })();
   ```

3. **Energy Points Award (Step 10)**
   ```typescript
   // MISSING - Should award:
   const { data: streakData } = await supabase
     .from('user_streaks')
     .select('current_streak')
     .eq('user_id', user.id)
     .single();
   
   const currentStreak = streakData?.current_streak || 0;
   const { awardEnergyPoints } = await import('@/services/energyPoints');
   await awardEnergyPoints(user.id, 'problem', undefined,
                          'oge_math_fipi_bank', currentStreak);
   ```

4. **Success Toast (Step 11)**
   ```typescript
   // MISSING - Should show:
   toast.success(`Анализ готов! Баллы: ${scores}/2`);
   ```

5. **StudentSolutionCard Source Fix**
   - Currently: Reads from `telegram_uploads.extracted_text`
   - Should: Read from `profiles.telegram_input` (latest for current user)
   - Note: `profiles.telegram_input` is updated by `process-device-photos` edge function

6. **Robust Error Handling (Step 8)**
   - Missing: Toast error if `updateStudentActivity` fails
   - Current: Silent failure

7. **Fallback Attempt Query (Step 1)**
   - Missing: Query for latest unfinished attempt if `currentAttemptId` missing
   - Current: Just creates new attempt

---

## UI Requirement Implementation Status

### ✅ Result Alert
- **Status**: ✅ IMPLEMENTED
- **Location**: Lines 1877-1896
- **Works**: Shows green/red alert based on `isCorrect`

### ⚠️ StudentSolutionCard
- **Status**: ⚠️ NEEDS FIX
- **Location**: Lines 1901, 1968
- **Current Issue**: Reads from wrong table (`telegram_uploads` instead of `profiles`)
- **Fix**: Update component to read from `profiles.telegram_input`

### ✅ AnalysisReviewCard
- **Status**: ✅ IMPLEMENTED
- **Location**: Line 1903, 1969-1989
- **Works**: Shows analysis with scores and review

---

## Summary Table

| Step | Component | Status | Priority |
|------|-----------|--------|----------|
| 1. Ensure attempt exists | `startAttempt()` | ⚠️ Partial | Medium |
| 2. Open progress modal | Progress Dialog | ✅ Full | - |
| 3. OCR images | `process-device-photos` | ✅ Full | - |
| 4. Fetch OCR text | Profile query | ✅ Full | - |
| 5. Analyze | `analyze-photo-solution` | ✅ Full | - |
| 6. Parse + validate | Parsing logic | ⚠️ Partial | **Critical** |
| 7. Compute grading | `isCorrect` calc | ✅ Full | - |
| 8. Update student_activity | `updateStudentActivity()` | ⚠️ Partial | **High** |
| 9. Fire-and-forget mastery | `handle-submission` | ❌ Missing | **Critical** |
| 10. Award energy points | Energy service | ❌ Missing | **High** |
| 11. Finalize UI | State cleanup | ⚠️ Partial | Medium |
| 12. Failure handler | Error handling | ✅ Full | - |
| StudentSolutionCard data source | Component | ⚠️ Needs Fix | **High** |

---

## Risk Assessment

### 🔴 Critical (Must Fix)
1. **Scores coercion** - API might return string/decimal that breaks grading
2. **Fire-and-forget mastery update** - Student mastery won't update without this
3. **StudentSolutionCard source** - Shows wrong OCR data

### 🟡 High Priority
1. **Energy points** - Student won't be rewarded for effort
2. **Attempt fallback** - Edge case could cause data loss
3. **Error handling** - Silent failures hard to debug

### 🟢 Medium Priority
1. **Success toast** - UX improvement
2. **Robust error messages** - User feedback

---

## Testing Checklist

Before production deployment:

- [ ] Device upload with 1-3 images
- [ ] API returns scores as number, string, with comma/point decimals
- [ ] Scores outside [0,2] range get clamped
- [ ] Student mastery updates (check mastery table after submission)
- [ ] Energy points awarded (check energy table)
- [ ] StudentSolutionCard shows correct OCR from `profiles.telegram_input`
- [ ] AnalysisReviewCard renders correctly
- [ ] Success toast appears
- [ ] Failure scenarios show proper error messages
- [ ] Attempt data saved correctly
- [ ] Session results recorded



