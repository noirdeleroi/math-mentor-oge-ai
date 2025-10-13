import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LogOut } from 'lucide-react';
import { Sidebar } from '@/components/mydb3/Sidebar';
import { UserInfoStripe } from '@/components/mydb3/UserInfoStripe';
import { CourseTreeCard } from '@/components/mydb3/CourseTreeCard';
import { CourseSelectionModal } from '@/components/mydb3/CourseSelectionModal';
import { CourseOnboardingWizard } from '@/components/mydb3/CourseOnboardingWizard';
import { useDashboardLogic } from '@/hooks/useDashboardLogic';
import { COURSES, CourseId, courseIdToNumber } from '@/lib/courses.registry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MyDb3 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'delete'>('add');
  const [wizardQueue, setWizardQueue] = useState<CourseId[]>([]);
  const [currentWizardCourse, setCurrentWizardCourse] = useState<CourseId | null>(null);
  
  const {
    myCourses,
    handleAddCourse,
    handleStartCourse,
  } = useDashboardLogic();

  const { signOut } = useAuth();

  // Convert user courses to our registry format
  const enrolledCourses = myCourses.map(course => COURSES[course.id as CourseId]).filter(Boolean);
  const enrolledCourseIds = enrolledCourses.map(course => course.id);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = () => {
    setModalMode('delete');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddCourses = async (courseIds: CourseId[]) => {
    const welcomeMessage = `**Привет! Добро пожаловать!**

Это твой Воркспейс: здесь есть чат для любого вопроса и навигация по всем разделам. Вот краткое руководство, чтобы быстро разобраться:

🧩 **1. Страница "Практика"**
Здесь можно решать задачи по номерам, как на экзамене.
Также доступны:

* **Пробный Экзамен** — тренировочный вариант, максимально похожий на реальный;
* **Домашнее Задание** — задания на день, которые система создает для тебя;
* **Повторение** — задачи по темам, где у тебя раньше были ошибки.

🏫 **2. Страница "Платформа"**
Тут собрана теория, задачи с вариантами ответов и ссылки на **📖 Учебник**. Используй эту страницу, чтобы разбираться в темах глубже.

📊 **3. Страница "Прогресс"**
Здесь ты видишь свой успех по темам и номерам задач.
Нажми **"Обновить Прогресс"**, чтобы учесть последние результаты. По умолчанию показывается статистика до сегодняшнего дня.

📝 **4. Твой ИИ-учитель создаёт задание каждый день**
После твоей активности ИИ-учитель автоматически подберёт новое задание на следующий день.

🔭 **5. Где найти задание**
Зайди в сторис c аватаркой твоего ИИ-учителя. Там ты найдёшь кнопки «Уроки на сегодня» и «Перейти к домашнему заданию».

🖍️ **6. Выделение текста**
Если что-то непонятно — нажми **"Включить Выделение"** и выдели текст (в учебнике, в задаче, где угодно). Платформа сразу объяснит выделенный фрагмент с помощью встроенного чата.

💙 **7. Подключи Telegram-бота!**
Используй код из своего профиля, чтобы подключить Telegram-бота. Это нужно, чтобы отправлять фото своих решений на проверку!

**Начинай заниматься прямо сейчас. Ты быстро привыкнешь к платформе, и обучение станет проще и интереснее каждый день!**
**Здесь ты можешь готовиться к экзаменам легко, интересно и эффективно!**`;

    // First-lesson story "task" text
    const firstLessonTask = `Привет! Рад тебя видеть на нашем занятии. У нас сегодня интересная
работа по плану, чтобы уверенно двигаться к твоей цели — **18 баллам**
на экзамене.

Поскольку это наше первое занятие (или не было данных о прошлом), мы
пока не можем проанализировать ошибки, но это отлично, так как мы
начинаем с чистого листа! Весь твой текущий прогресс низкий (2%), что
совершенно нормально — впереди много времени (целых 229 дней!), чтобы
всё наверстать, работая по 8 часов в неделю.

### 🎯 План на сегодня (1 час)

Сегодня мы закладываем фундамент. Наша задача — освоить самые базовые
арифметические навыки.

#### 1. Повторение (0 минут)
Поскольку прошлых ошибок нет, мы сразу переходим к плану. Помни: даже
самые простые темы (как сегодня) — это основа для сложных задач в
будущем.

#### 2. Изучение новых тем (40 минут)

Мы сфокусируемся на первых двух блоках:

*   **1.1 Натуральные и целые числа:** Повторим, что такое натуральные
числа (для счета) и целые числа (считаем и отрицательные). Это важно
для правильной записи ответов.
*   **1.2 Дроби и проценты:** Вспомним, как работают обыкновенные
дроби, и как легко переводить проценты в десятичные дроби. Эти навыки
понадобятся практически везде!

Работай с теорией в учебнике по этим темам и решай простые примеры.

#### 3. Практика по ФИПИ (20 минут)

На данный момент, поскольку ты только начинаешь, мы не будем брать
сложные задачи ФИПИ (номера 1-25). Мы сосредоточимся на теории. Как
только ты уверенно решишь базовые примеры по темам 1.1 и 1.2 из
учебника, тогда перейдем к задачам, связанным с этими темами
(например, задачи №6 и №7).

**Твоя миссия сегодня:** Убедиться, что ты одинаково легко оперируешь
целыми числами (включая отрицательные) и любыми дробями.

Не торопись! Если что-то непонятно в теории, обязательно напиши мне в
чат, и мы разберем это подробно. Успехов с первым шагом!`;

    // JSON payloads for stories_and_telegram (store as strings if columns are text)
    const hardcodeTaskObj = {
      "темы для изучения": ["1.1", "1.2"],
      "навыки с наибольшей важностью для выбранных тем": [1,2,3,4,5,6,7,8,9],
      "Задачи ФИПИ для тренировки": [],
      "навыки для подтягивания": []
    };

    const previouslyFailedObj = {
      "time_task": null,
      "time_mastery": null,
      "темы с ошибками": []
    };

    const previousHomeworkQuestionIdsObj = {
      "MCQ": [],
      "FIPI": []
    };

    const resultOfPrevHomeworkCompletion: unknown[] = [];
    const studentActivitySessionResults: unknown[] = [];

    // Enroll courses in database + insert welcome chat + insert first story
    for (const courseId of courseIds) {
      const courseNumber = courseIdToNumber[courseId]; // 1 | 2 | 3

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile.courses
      const { data: profile } = await supabase
        .from('profiles')
        .select('courses')
        .eq('user_id', user.id)
        .single();

      const currentCourseNumbers: number[] = profile?.courses || [];
      const newCourseNumbers = [...currentCourseNumbers, courseNumber];

      // Update profile with new course
      await supabase
        .from('profiles')
        .update({ courses: newCourseNumbers })
        .eq('user_id', user.id);

      // Initialize priors for the course
      try {
        await supabase.functions.invoke('initialize-priors', {
          body: { 
            user_id: user.id,
            course_id: courseNumber.toString()
          }
        });
      } catch (error) {
        console.error('Error initializing priors:', error);
      }

      // Insert welcome message into chat_logs
      try {
        await supabase.from('chat_logs').insert({
          user_id: user.id,
          course_id: courseNumber.toString(), // text
          user_message: 'Описание страниц на платформе',
          response: welcomeMessage,
          time_of_user_message: new Date().toISOString(),
          time_of_response: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error inserting welcome message:', error);
      }

      // --- NEW: Insert initial story into stories_and_telegram ---
      try {
        const uploadId = Math.floor(100000 + Math.random() * 900000); // random 6 digits

        await supabase.from('stories_and_telegram').insert({
          user_id: user.id,
          course_id: courseNumber.toString(),            // text column
          upload_id: uploadId,                            // 6-digit number
          seen: 0,                                        // not seen
          task: firstLessonTask,                          // long task text
          hardcode_task: JSON.stringify(hardcodeTaskObj), // store JSON as string
          previously_failed_topics: JSON.stringify(previouslyFailedObj),
          previous_homework_question_ids: JSON.stringify(previousHomeworkQuestionIdsObj),
          result_of_prev_homework_completion: JSON.stringify(resultOfPrevHomeworkCompletion),
          student_activity_session_results: JSON.stringify(studentActivitySessionResults)
          // created_at will use default NOW() if your table has it
        });
      } catch (error) {
        console.error('Error inserting initial story:', error);
      }
      // --- END NEW ---
    }
    
    // Close modal and start wizard flow
    setIsModalOpen(false);
    setWizardQueue(courseIds);
    startNextWizard(courseIds);
  };

  const startNextWizard = (queue: CourseId[]) => {
    if (queue.length > 0) {
      const [nextCourse, ...remainingCourses] = queue;
      setCurrentWizardCourse(nextCourse);
      setWizardQueue(remainingCourses);
    }
  };

  const handleWizardDone = () => {
    setCurrentWizardCourse(null);
    
    if (wizardQueue.length > 0) {
      // Start next wizard
      startNextWizard(wizardQueue);
    } else {
      // All wizards complete, refresh page
      window.location.reload();
    }
  };

  const handleWizardError = () => {
    // For now, continue to next wizard even on error
    handleWizardDone();
  };

  const handleDeleteCourses = async (courseIds: CourseId[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the database function for each course using numeric course IDs
      for (const courseId of courseIds) {
        const numericCourseId = courseIdToNumber[courseId].toString();
        const { error } = await supabase.rpc('delete_course_data', {
          p_user_id: user.id,
          p_course_id: numericCourseId
        });
        
        if (error) {
          console.error('Error deleting course data:', error);
        }
      }
      
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Error in handleDeleteCourses:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* User Info Stripe */}
          <UserInfoStripe />
          
          {/* My Courses Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Мои курсы</h1>
              <Button 
                onClick={handleOpenDeleteModal}
                className="bg-black hover:bg-gradient-to-r hover:from-yellow-500 hover:to-emerald-500 hover:shadow-lg text-white"
              >
                Редактировать курсы
              </Button>
            </div>

            {enrolledCourses.length === 0 ? (
              /* No courses - show empty state with large plus button */
              <div className="text-center py-16">
                <div className="mb-8">
                    <Button
                      onClick={handleOpenAddModal}
                      variant="outline"
                      size="lg"
                      className="w-32 h-32 rounded-full border-2 border-dashed border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/5 transition-all duration-200"
                    >
                      <Plus className="w-12 h-12 text-yellow-600" />
                    </Button>
                </div>
                <p className="text-muted-foreground text-lg">Добавить другой курс</p>
              </div>
            ) : (
              /* Has courses - show course grid with add button */
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {enrolledCourses.map((course) => (
                    <CourseTreeCard
                      key={course.id}
                      course={course}
                      onStart={handleStartCourse}
                    />
                  ))}
                  
                  {/* Add course card */}
                  <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-muted-foreground/20 rounded-lg">
                    <div className="text-center">
                      <Button
                        onClick={handleOpenAddModal}
                        variant="outline"
                        size="lg"
                        className="w-20 h-20 rounded-full border-2 border-dashed border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/5 transition-all duration-200 mb-4"
                      >
                        <Plus className="w-8 h-8 text-yellow-600" />
                      </Button>
                      <p className="text-muted-foreground">Добавить другой курс</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Selection Modal */}
      <CourseSelectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddCourses={handleAddCourses}
        onDeleteCourses={handleDeleteCourses}
        enrolledCourseIds={enrolledCourseIds}
        mode={modalMode}
      />

      {/* Course Onboarding Wizard */}
      {currentWizardCourse && (
        <CourseOnboardingWizard
          courseId={currentWizardCourse}
          onDone={handleWizardDone}
          onError={handleWizardError}
        />
      )}
    </div>
  );
};

export default MyDb3;
