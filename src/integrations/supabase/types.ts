export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      articles_oge_full: {
        Row: {
          article_text: string | null
          ID: number
          image_recommendations: string | null
          img1: string | null
          img2: string | null
          img3: string | null
          img4: string | null
          img5: string | null
          img6: string | null
          img7: string | null
        }
        Insert: {
          article_text?: string | null
          ID: number
          image_recommendations?: string | null
          img1?: string | null
          img2?: string | null
          img3?: string | null
          img4?: string | null
          img5?: string | null
          img6?: string | null
          img7?: string | null
        }
        Update: {
          article_text?: string | null
          ID?: number
          image_recommendations?: string | null
          img1?: string | null
          img2?: string | null
          img3?: string | null
          img4?: string | null
          img5?: string | null
          img6?: string | null
          img7?: string | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          course_id: string
          created_at: string
          embedded_response: string | null
          embedded_user: string | null
          id: string
          response: string
          time_of_response: string
          time_of_user_message: string
          user_id: string
          user_message: string
        }
        Insert: {
          course_id: string
          created_at?: string
          embedded_response?: string | null
          embedded_user?: string | null
          id?: string
          response: string
          time_of_response?: string
          time_of_user_message?: string
          user_id: string
          user_message: string
        }
        Update: {
          course_id?: string
          created_at?: string
          embedded_response?: string | null
          embedded_user?: string | null
          id?: string
          response?: string
          time_of_response?: string
          time_of_user_message?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      daily_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      egemathbase: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: string | null
          comments: string | null
          corrected: string | null
          difficulty: number | null
          fipi_id: string | null
          number_id: string | null
          problem_image: string | null
          problem_link: string | null
          problem_number_type: string | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: string | null
          solution_image: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          steps_number: string | null
          topics: string | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
          fipi_id?: string | null
          number_id?: string | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: string | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: string | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          topics?: string | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
          fipi_id?: string | null
          number_id?: string | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: string | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: string | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          topics?: string | null
          type?: string | null
        }
        Relationships: []
      }
      egemathprof: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: string | null
          comments: string | null
          corrected: string | null
          difficulty: string | null
          fipi_id: string | null
          number_id: string | null
          problem_image: string | null
          problem_link: string | null
          problem_number_type: number | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: string | null
          solution_image: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          steps_number: string | null
          topics: string | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: string | null
          fipi_id?: string | null
          number_id?: string | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: number | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: string | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          topics?: string | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: string | null
          fipi_id?: string | null
          number_id?: string | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: number | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: string | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          topics?: string | null
          type?: string | null
        }
        Relationships: []
      }
      entrypage_query_data: {
        Row: {
          timestamp: string
          userquery: string | null
        }
        Insert: {
          timestamp: string
          userquery?: string | null
        }
        Update: {
          timestamp?: string
          userquery?: string | null
        }
        Relationships: []
      }
      essay_topics: {
        Row: {
          essay_topic: string
          id: string
          rules: string | null
          subject: string
        }
        Insert: {
          essay_topic: string
          id?: string
          rules?: string | null
          subject: string
        }
        Update: {
          essay_topic?: string
          id?: string
          rules?: string | null
          subject?: string
        }
        Relationships: []
      }
      homework_progress: {
        Row: {
          accuracy_percentage: number | null
          attempt_number: number | null
          completed_at: string | null
          completion_status: string | null
          confidence_level: number | null
          correct_answer: string | null
          created_at: string
          difficulty_level: number | null
          homework_date: string | null
          homework_name: string | null
          homework_task: string | null
          id: number
          is_correct: boolean | null
          problem_number: number | null
          q_number: string | null
          question_id: string | null
          question_type: string | null
          questions_completed: number | null
          questions_correct: number | null
          response_time_seconds: number | null
          session_number: number | null
          showed_solution: boolean | null
          skill_ids: number[] | null
          started_at: string | null
          total_questions: number | null
          user_answer: string | null
          user_id: string | null
        }
        Insert: {
          accuracy_percentage?: number | null
          attempt_number?: number | null
          completed_at?: string | null
          completion_status?: string | null
          confidence_level?: number | null
          correct_answer?: string | null
          created_at?: string
          difficulty_level?: number | null
          homework_date?: string | null
          homework_name?: string | null
          homework_task?: string | null
          id?: number
          is_correct?: boolean | null
          problem_number?: number | null
          q_number?: string | null
          question_id?: string | null
          question_type?: string | null
          questions_completed?: number | null
          questions_correct?: number | null
          response_time_seconds?: number | null
          session_number?: number | null
          showed_solution?: boolean | null
          skill_ids?: number[] | null
          started_at?: string | null
          total_questions?: number | null
          user_answer?: string | null
          user_id?: string | null
        }
        Update: {
          accuracy_percentage?: number | null
          attempt_number?: number | null
          completed_at?: string | null
          completion_status?: string | null
          confidence_level?: number | null
          correct_answer?: string | null
          created_at?: string
          difficulty_level?: number | null
          homework_date?: string | null
          homework_name?: string | null
          homework_task?: string | null
          id?: number
          is_correct?: boolean | null
          problem_number?: number | null
          q_number?: string | null
          question_id?: string | null
          question_type?: string | null
          questions_completed?: number | null
          questions_correct?: number | null
          response_time_seconds?: number | null
          session_number?: number | null
          showed_solution?: boolean | null
          skill_ids?: number[] | null
          started_at?: string | null
          total_questions?: number | null
          user_answer?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      json_files: {
        Row: {
          content: Json | null
          course_id: string | null
          description: string | null
          id: number
        }
        Insert: {
          content?: Json | null
          course_id?: string | null
          description?: string | null
          id?: number
        }
        Update: {
          content?: Json | null
          course_id?: string | null
          description?: string | null
          id?: number
        }
        Relationships: []
      }
      mastery_snapshots: {
        Row: {
          computed_summary: Json
          course_id: string | null
          id: number
          raw_data: Json
          run_timestamp: string
          stats: Json | null
          user_id: string
        }
        Insert: {
          computed_summary: Json
          course_id?: string | null
          id?: number
          raw_data: Json
          run_timestamp?: string
          stats?: Json | null
          user_id: string
        }
        Update: {
          computed_summary?: Json
          course_id?: string | null
          id?: number
          raw_data?: Json
          run_timestamp?: string
          stats?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      oge_entrypage_rag: {
        Row: {
          category_description: string | null
          context: string | null
          id: number
          system_prompt: string | null
          task_context: string | null
        }
        Insert: {
          category_description?: string | null
          context?: string | null
          id: number
          system_prompt?: string | null
          task_context?: string | null
        }
        Update: {
          category_description?: string | null
          context?: string | null
          id?: number
          system_prompt?: string | null
          task_context?: string | null
        }
        Relationships: []
      }
      oge_math_fipi_bank: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: string | null
          comments: string | null
          corrected: string | null
          difficulty: number | null
          fipi_id: string | null
          number_id: number | null
          problem_image: string | null
          problem_link: string | null
          problem_number_type: number | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: string | null
          solution_image: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          steps_number: string | null
          topics: string | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
          fipi_id?: string | null
          number_id?: number | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: number | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: string | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          topics?: string | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
          fipi_id?: string | null
          number_id?: number | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: number | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: string | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          topics?: string | null
          type?: string | null
        }
        Relationships: []
      }
      oge_math_skills_questions: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: string | null
          code: string | null
          comments: string | null
          corrected: string | null
          difficulty: number | null
          option1: string | null
          option2: string | null
          option3: string | null
          option4: string | null
          problem_image: string | null
          problem_link: string | null
          problem_number_type: string | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: number | null
          solution_image: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          steps_number: string | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          code?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          option4?: string | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: string | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: number | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: string | null
          code?: string | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          option4?: string | null
          problem_image?: string | null
          problem_link?: string | null
          problem_number_type?: string | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: number | null
          solution_image?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          steps_number?: string | null
          type?: string | null
        }
        Relationships: []
      }
      pending_homework_feedback: {
        Row: {
          chat_context: Json | null
          context_data: Json | null
          course_id: string
          created_at: string
          error_message: string | null
          feedback_message: string | null
          feedback_type: string
          homework_name: string | null
          id: string
          processed: boolean | null
          processed_at: string | null
          processing_started_at: string | null
          user_id: string
        }
        Insert: {
          chat_context?: Json | null
          context_data?: Json | null
          course_id: string
          created_at?: string
          error_message?: string | null
          feedback_message?: string | null
          feedback_type: string
          homework_name?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          processing_started_at?: string | null
          user_id: string
        }
        Update: {
          chat_context?: Json | null
          context_data?: Json | null
          course_id?: string
          created_at?: string
          error_message?: string | null
          feedback_message?: string | null
          feedback_type?: string
          homework_name?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          processing_started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      photo_analysis_outputs: {
        Row: {
          analysis_type: string | null
          created_at: string
          exam_id: string | null
          id: string
          openrouter_check: string | null
          problem_number: string | null
          question_id: string | null
          raw_output: string
          user_id: string
        }
        Insert: {
          analysis_type?: string | null
          created_at?: string
          exam_id?: string | null
          id?: string
          openrouter_check?: string | null
          problem_number?: string | null
          question_id?: string | null
          raw_output: string
          user_id: string
        }
        Update: {
          analysis_type?: string | null
          created_at?: string
          exam_id?: string | null
          id?: string
          openrouter_check?: string | null
          problem_number?: string | null
          question_id?: string | null
          raw_output?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          course_1_goal: string | null
          course_2_goal: string | null
          course_3_goal: string | null
          courses: number[] | null
          created_at: string
          exam_id: string | null
          full_name: string | null
          homework: string | null
          homework2: string | null
          homework3: string | null
          id: string
          image_proccessing_command: string | null
          schoolmark1: number | null
          schoolmark2: number | null
          schoolmark3: number | null
          selfestimation1: number | null
          selfestimation2: number | null
          selfestimation3: number | null
          telegram_code: number | null
          telegram_input: string | null
          telegram_user_id: number | null
          testmark1: number | null
          testmark2: number | null
          testmark3: number | null
          tutor_avatar_url: string | null
          tutor_id: string | null
          tutor_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          course_1_goal?: string | null
          course_2_goal?: string | null
          course_3_goal?: string | null
          courses?: number[] | null
          created_at?: string
          exam_id?: string | null
          full_name?: string | null
          homework?: string | null
          homework2?: string | null
          homework3?: string | null
          id?: string
          image_proccessing_command?: string | null
          schoolmark1?: number | null
          schoolmark2?: number | null
          schoolmark3?: number | null
          selfestimation1?: number | null
          selfestimation2?: number | null
          selfestimation3?: number | null
          telegram_code?: number | null
          telegram_input?: string | null
          telegram_user_id?: number | null
          testmark1?: number | null
          testmark2?: number | null
          testmark3?: number | null
          tutor_avatar_url?: string | null
          tutor_id?: string | null
          tutor_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          course_1_goal?: string | null
          course_2_goal?: string | null
          course_3_goal?: string | null
          courses?: number[] | null
          created_at?: string
          exam_id?: string | null
          full_name?: string | null
          homework?: string | null
          homework2?: string | null
          homework3?: string | null
          id?: string
          image_proccessing_command?: string | null
          schoolmark1?: number | null
          schoolmark2?: number | null
          schoolmark3?: number | null
          selfestimation1?: number | null
          selfestimation2?: number | null
          selfestimation3?: number | null
          telegram_code?: number | null
          telegram_input?: string | null
          telegram_user_id?: number | null
          testmark1?: number | null
          testmark2?: number | null
          testmark3?: number | null
          tutor_avatar_url?: string | null
          tutor_id?: string | null
          tutor_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories_and_telegram: {
        Row: {
          course_id: string | null
          created_at: string | null
          hardcode_task: string | null
          previous_homework_question_ids: Json | null
          previously_failed_topics: string | null
          problem_submission_id: string | null
          result_of_prev_homework_completion: Json | null
          seen: number | null
          student_activity_session_results: Json | null
          task: string | null
          telegram_notification: number | null
          telegram_user_id: number | null
          upload_id: number
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          hardcode_task?: string | null
          previous_homework_question_ids?: Json | null
          previously_failed_topics?: string | null
          problem_submission_id?: string | null
          result_of_prev_homework_completion?: Json | null
          seen?: number | null
          student_activity_session_results?: Json | null
          task?: string | null
          telegram_notification?: number | null
          telegram_user_id?: number | null
          upload_id: number
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          hardcode_task?: string | null
          previous_homework_question_ids?: Json | null
          previously_failed_topics?: string | null
          problem_submission_id?: string | null
          result_of_prev_homework_completion?: Json | null
          seen?: number | null
          student_activity_session_results?: Json | null
          task?: string | null
          telegram_notification?: number | null
          telegram_user_id?: number | null
          upload_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      student_activity: {
        Row: {
          answer_time_start: string
          attempt_id: number
          course_id: string | null
          created_at: string
          duration_answer: number | null
          finished_or_not: boolean
          is_correct: boolean | null
          problem_number_type: number
          question_id: string
          scores_fipi: number | null
          skills: number[] | null
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_time_start: string
          attempt_id?: number
          course_id?: string | null
          created_at?: string
          duration_answer?: number | null
          finished_or_not: boolean
          is_correct?: boolean | null
          problem_number_type: number
          question_id: string
          scores_fipi?: number | null
          skills?: number[] | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_time_start?: string
          attempt_id?: number
          course_id?: string | null
          created_at?: string
          duration_answer?: number | null
          finished_or_not?: boolean
          is_correct?: boolean | null
          problem_number_type?: number
          question_id?: string
          scores_fipi?: number | null
          skills?: number[] | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_essay1: {
        Row: {
          analysis: string | null
          created_at: string
          essay_topic_id: string
          id: string
          score: number | null
          text_scan: string | null
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          essay_topic_id: string
          id?: string
          score?: number | null
          text_scan?: string | null
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          essay_topic_id?: string
          id?: string
          score?: number | null
          text_scan?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_essay1_essay_topic_id_fkey"
            columns: ["essay_topic_id"]
            isOneToOne: false
            referencedRelation: "essay_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_mastery: {
        Row: {
          alpha: number
          beta: number
          course_id: string
          created_at: string | null
          cusum_s: number | null
          entity_id: number
          entity_type: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alpha: number
          beta: number
          course_id: string
          created_at?: string | null
          cusum_s?: number | null
          entity_id: number
          entity_type: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alpha?: number
          beta?: number
          course_id?: string
          created_at?: string | null
          cusum_s?: number | null
          entity_id?: number
          entity_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_mastery_status: {
        Row: {
          course_id: string | null
          created_at: string
          entity_id: number
          entity_type: string
          id: string
          last_updated: string
          status: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          entity_id: number
          entity_type: string
          id?: string
          last_updated?: string
          status?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          entity_id?: number
          entity_type?: string
          id?: string
          last_updated?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      telegram_uploads: {
        Row: {
          created_at: string | null
          extracted_text: string | null
          id: number
          problem_submission_id: string
          question_id: string | null
          telegram_upload_content: string
          telegram_user_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          extracted_text?: string | null
          id?: number
          problem_submission_id: string
          question_id?: string | null
          telegram_upload_content: string
          telegram_user_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          extracted_text?: string | null
          id?: number
          problem_submission_id?: string
          question_id?: string | null
          telegram_upload_content?: string
          telegram_user_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      textbook_progress: {
        Row: {
          activity: string | null
          activity_type: string | null
          correct_count: string | null
          created_at: string
          id: number
          item_id: string | null
          module_id: string | null
          skills_involved: string | null
          solved_count: string | null
          total_questions: string | null
          user_id: string | null
          work_done: string | null
        }
        Insert: {
          activity?: string | null
          activity_type?: string | null
          correct_count?: string | null
          created_at?: string
          id?: number
          item_id?: string | null
          module_id?: string | null
          skills_involved?: string | null
          solved_count?: string | null
          total_questions?: string | null
          user_id?: string | null
          work_done?: string | null
        }
        Update: {
          activity?: string | null
          activity_type?: string | null
          correct_count?: string | null
          created_at?: string
          id?: number
          item_id?: string | null
          module_id?: string | null
          skills_involved?: string | null
          solved_count?: string | null
          total_questions?: string | null
          user_id?: string | null
          work_done?: string | null
        }
        Relationships: []
      }
      topic_articles: {
        Row: {
          topic_id: string
          topic_text: string | null
        }
        Insert: {
          topic_id: string
          topic_text?: string | null
        }
        Update: {
          topic_id?: string
          topic_text?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          id: string
          price: string | null
          tokens_in: string | null
          tokens_out: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: string | null
          tokens_in?: string | null
          tokens_out?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: string | null
          tokens_in?: string | null
          tokens_out?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          average_score: number
          completed_lessons: number
          created_at: string
          energy_points: number
          energy_points_history: Json | null
          id: string
          practice_problems: number
          quizzes_completed: number
          updated_at: string
          user_id: string
          weekly_goal_set_at: string | null
        }
        Insert: {
          average_score?: number
          completed_lessons?: number
          created_at?: string
          energy_points?: number
          energy_points_history?: Json | null
          id?: string
          practice_problems?: number
          quizzes_completed?: number
          updated_at?: string
          user_id: string
          weekly_goal_set_at?: string | null
        }
        Update: {
          average_score?: number
          completed_lessons?: number
          created_at?: string
          energy_points?: number
          energy_points_history?: Json | null
          id?: string
          practice_problems?: number
          quizzes_completed?: number
          updated_at?: string
          user_id?: string
          weekly_goal_set_at?: string | null
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number
          daily_goal_minutes: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          daily_goal_minutes?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          daily_goal_minutes?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_course_data: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
