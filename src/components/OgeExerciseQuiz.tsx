{/* Final Results Dialog - Gen Z Redesign */}
      <AlertDialog open={showFinalResults} onOpenChange={setShowFinalResults}>
        <AlertDialogContent className="sm:max-w-lg border-none rounded-[32px] bg-white shadow-2xl p-0 overflow-hidden">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-sage/10 to-gold/5 animate-pulse" style={{animationDuration: '3s'}} />
          
          {/* Top Accent Bar */}
          <div className="h-2 bg-gradient-to-r from-gold via-sage to-gold" />
          
          <div className="relative p-8">
            <AlertDialogHeader className="text-center space-y-6">
              {/* Icon with Glow Effect */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold to-sage rounded-full blur-xl opacity-40 animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-gold to-sage rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                    {getResultMessage().icon}
                  </div>
                </div>
              </div>
              
              {/* Title */}
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-gold via-sage to-gold bg-clip-text text-transparent">
                    {getResultMessage().title}
                  </span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-navy/60 font-medium">
                  {getResultMessage().message}
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 my-8">
              {/* Correct Answers */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sage/10 to-transparent p-6 hover:scale-105 transition-all duration-300 cursor-default">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-sage/20 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="text-4xl font-black bg-gradient-to-br from-sage to-emerald-600 bg-clip-text text-transparent mb-1">
                    {correctAnswers}
                  </div>
                  <div className="text-xs font-bold text-navy/50 uppercase tracking-wider">из {questions.length}</div>
                </div>
              </div>
              
              {/* Accuracy */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/10 to-transparent p-6 hover:scale-105 transition-all duration-300 cursor-default">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gold/20 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="text-4xl font-black bg-gradient-to-br from-gold to-orange-500 bg-clip-text text-transparent mb-1">
                    {score}%
                  </div>
                  <div className="text-xs font-bold text-navy/50 uppercase tracking-wider">точность</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <AlertDialogFooter className="flex-col gap-3 w-full mt-6">
              {/* Retry Button (if needed) */}
              {correctAnswers < 3 && (
                <AlertDialogAction
                  onClick={handleRetry}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <div className="relative flex items-center justify-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    <span>попробовать еще раз</span>
                  </div>
                </AlertDialogAction>
              )}
              
              {/* AI Assistant Button */}
              <AlertDialogAction 
                onClick={async () => {
                  if (!user) {
                    toast({
                      title: 'Ошибка',
                      description: 'Необходимо войти в систему',
                      variant: 'destructive'
                    });
                    return;
                  }

                  try {
                    const activityType = questionCount === 10 || isModuleTest ? "exam" : questionCount === 6 ? "test" : "exercise";
                    const activityTypeRu = activityType === 'exam' ? 'Экзамен' : activityType === 'test' ? 'Тест' : 'Упражнение';

                    const feedbackMessage = `**${activityTypeRu.toUpperCase()}: ${title}**\n\n` +
                      `✅ Правильных ответов: ${correctAnswers} из ${questions.length}\n` +
                      `📊 Точность: ${score}%\n` +
                      `🎯 Навыки: #${skills.join(', #')}\n\n` +
                      (score >= 75 ? '🎉 Отличная работа! Ты хорошо освоил этот материал.' :
                       score >= 50 ? '👍 Неплохой результат! Продолжай практиковаться.' :
                       '💪 Не останавливайся! Изучи теорию и попробуй еще раз.');

                    const { data: pendingRecord, error: insertError } = await supabase
                      .from('pending_homework_feedback')
                      .insert({
                        user_id: user.id,
                        course_id: courseId,
                        feedback_type: 'textbook_exercise',
                        homework_name: title,
                        context_data: {
                          activityType,
                          totalQuestions: questions.length,
                          questionsCorrect: correctAnswers,
                          accuracy: score,
                          skills: skills,
                          itemId: itemId || `exercise-${skills.join("-")}`,
                          completedAt: new Date().toISOString(),
                          timestamp: Date.now()
                        },
                        processed: true,
                        processed_at: new Date().toISOString(),
                        feedback_message: feedbackMessage
                      })
                      .select('id')
                      .single();

                    if (insertError) {
                      console.error('Failed to create feedback record:', insertError);
                      navigate('/ogemath');
                      return;
                    }

                    navigate(`/ogemath?pending_feedback=${pendingRecord.id}`);
                  } catch (error) {
                    console.error('Error creating exercise feedback:', error);
                    navigate('/ogemath');
                  }
                }}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-navy to-navy/90 hover:from-navy/90 hover:to-navy/80 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-xl">💬</span>
                  <span>к ИИ ассистенту</span>
                </div>
              </AlertDialogAction>
              
              {/* Back Button */}
              <AlertDialogAction 
                onClick={onBack}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-gold to-sage hover:from-gold/90 hover:to-sage/90 text-white rounded-2xl px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 border-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="relative flex items-center justify-center gap-2">
                  <span>←</span>
                  <span>назад к модулю</span>
                </div>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
