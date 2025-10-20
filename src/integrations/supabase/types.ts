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
      articles: {
        Row: {
          art: string | null
          skill: number
        }
        Insert: {
          art?: string | null
          skill?: number
        }
        Update: {
          art?: string | null
          skill?: number
        }
        Relationships: []
      }
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
      articles_oge_topics: {
        Row: {
          id: number
          topic_text: string | null
        }
        Insert: {
          id?: number
          topic_text?: string | null
        }
        Update: {
          id?: number
          topic_text?: string | null
        }
        Relationships: []
      }
      articles2: {
        Row: {
          art: string | null
          img1: string | null
          img2: string | null
          img3: string | null
          img4: string | null
          img5: string | null
          img6: string | null
          img7: string | null
          skill: number
        }
        Insert: {
          art?: string | null
          img1?: string | null
          img2?: string | null
          img3?: string | null
          img4?: string | null
          img5?: string | null
          img6?: string | null
          img7?: string | null
          skill?: number
        }
        Update: {
          art?: string | null
          img1?: string | null
          img2?: string | null
          img3?: string | null
          img4?: string | null
          img5?: string | null
          img6?: string | null
          img7?: string | null
          skill?: number
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          course_id: string
          created_at: string
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
          id?: string
          response?: string
          time_of_response?: string
          time_of_user_message?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      copy: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: boolean | null
          checked: boolean | null
          code: string | null
          corrected: boolean | null
          difficulty: string | null
          problem_image: string | null
          problem_number: number | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: string | null
          skills_for_step_1: string | null
          skills_for_step_10: string | null
          skills_for_step_11: string | null
          skills_for_step_12: string | null
          skills_for_step_13: string | null
          skills_for_step_14: string | null
          skills_for_step_15: string | null
          skills_for_step_2: string | null
          skills_for_step_3: string | null
          skills_for_step_4: string | null
          skills_for_step_5: string | null
          skills_for_step_6: string | null
          skills_for_step_7: string | null
          skills_for_step_8: string | null
          skills_for_step_9: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          step1_expanded_text: string | null
          step1_text: string | null
          step10_expanded_text: string | null
          step10_text: string | null
          step11_expanded_text: string | null
          step11_text: string | null
          step12_expanded_text: string | null
          step12_text: string | null
          step13_expanded_text: string | null
          step13_text: string | null
          step14_expanded_text: string | null
          step14_text: string | null
          step15_expanded_text: string | null
          step15_text: string | null
          step2_expanded_text: string | null
          step2_text: string | null
          step3_expanded_text: string | null
          step3_text: string | null
          step4_expanded_text: string | null
          step4_text: string | null
          step5_expanded_text: string | null
          step5_text: string | null
          step6_expanded_text: string | null
          step6_text: string | null
          step7_expanded_text: string | null
          step7_text: string | null
          step8_expanded_text: string | null
          step8_text: string | null
          step9_expanded_text: string | null
          step9_text: string | null
          steps_number: number | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: boolean | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: string | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: string | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: boolean | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: string | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: string | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
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
      diagnostic_responses: {
        Row: {
          answered_at: string
          correct_answer: string
          difficulty: number
          id: string
          is_correct: boolean
          question_id: string
          response_time_seconds: number | null
          session_id: string
          skill_id: number
          user_answer: string | null
        }
        Insert: {
          answered_at?: string
          correct_answer: string
          difficulty: number
          id?: string
          is_correct: boolean
          question_id: string
          response_time_seconds?: number | null
          session_id: string
          skill_id: number
          user_answer?: string | null
        }
        Update: {
          answered_at?: string
          correct_answer?: string
          difficulty?: number
          id?: string
          is_correct?: boolean
          question_id?: string
          response_time_seconds?: number | null
          session_id?: string
          skill_id?: number
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_sessions: {
        Row: {
          completed_at: string | null
          correct_answers: number
          final_difficulty: number
          id: string
          started_at: string
          status: string
          total_questions: number
          uid: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number
          final_difficulty?: number
          id?: string
          started_at?: string
          status?: string
          total_questions?: number
          uid: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number
          final_difficulty?: number
          id?: string
          started_at?: string
          status?: string
          total_questions?: number
          uid?: string
        }
        Relationships: []
      }
      diagnostic_test_problems_1: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: boolean | null
          code: string | null
          corrected: boolean | null
          difficulty: number | null
          problem_answer: string | null
          problem_image: string | null
          problem_number: number | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skill: number | null
          skills: number | null
          skills_for_step_1: string | null
          skills_for_step_10: string | null
          skills_for_step_11: string | null
          skills_for_step_12: string | null
          skills_for_step_13: string | null
          skills_for_step_14: string | null
          skills_for_step_15: string | null
          skills_for_step_2: string | null
          skills_for_step_3: string | null
          skills_for_step_4: string | null
          skills_for_step_5: string | null
          skills_for_step_6: string | null
          skills_for_step_7: string | null
          skills_for_step_8: string | null
          skills_for_step_9: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          step1_expanded_text: string | null
          step1_text: string | null
          step10_expanded_text: string | null
          step10_text: string | null
          step11_expanded_text: string | null
          step11_text: string | null
          step12_expanded_text: string | null
          step12_text: string | null
          step13_expanded_text: string | null
          step13_text: string | null
          step14_expanded_text: string | null
          step14_text: string | null
          step15_expanded_text: string | null
          step15_text: string | null
          step2_expanded_text: string | null
          step2_text: string | null
          step3_expanded_text: string | null
          step3_text: string | null
          step4_expanded_text: string | null
          step4_text: string | null
          step5_expanded_text: string | null
          step5_text: string | null
          step6_expanded_text: string | null
          step6_text: string | null
          step7_expanded_text: string | null
          step7_text: string | null
          step8_expanded_text: string | null
          step8_text: string | null
          step9_expanded_text: string | null
          step9_text: string | null
          steps_number: number | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: number | null
          problem_answer?: string | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skill?: number | null
          skills?: number | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: number | null
          problem_answer?: string | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skill?: number | null
          skills?: number | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
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
      marking: {
        Row: {
          id: number
          marking_text: string | null
          text: string | null
        }
        Insert: {
          id?: number
          marking_text?: string | null
          text?: string | null
        }
        Update: {
          id?: number
          marking_text?: string | null
          text?: string | null
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
      mcq: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: boolean | null
          code: string | null
          corrected: boolean | null
          difficulty: number | null
          problem_image: string | null
          problem_number: number | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: number | null
          skills_for_step_1: string | null
          skills_for_step_10: string | null
          skills_for_step_11: string | null
          skills_for_step_12: string | null
          skills_for_step_13: string | null
          skills_for_step_14: string | null
          skills_for_step_15: string | null
          skills_for_step_2: string | null
          skills_for_step_3: string | null
          skills_for_step_4: string | null
          skills_for_step_5: string | null
          skills_for_step_6: string | null
          skills_for_step_7: string | null
          skills_for_step_8: string | null
          skills_for_step_9: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          step1_expanded_text: string | null
          step1_text: string | null
          step10_expanded_text: string | null
          step10_text: string | null
          step11_expanded_text: string | null
          step11_text: string | null
          step12_expanded_text: string | null
          step12_text: string | null
          step13_expanded_text: string | null
          step13_text: string | null
          step14_expanded_text: string | null
          step14_text: string | null
          step15_expanded_text: string | null
          step15_text: string | null
          step2_expanded_text: string | null
          step2_text: string | null
          step3_expanded_text: string | null
          step3_text: string | null
          step4_expanded_text: string | null
          step4_text: string | null
          step5_expanded_text: string | null
          step5_text: string | null
          step6_expanded_text: string | null
          step6_text: string | null
          step7_expanded_text: string | null
          step7_text: string | null
          step8_expanded_text: string | null
          step8_text: string | null
          step9_expanded_text: string | null
          step9_text: string | null
          steps_number: number | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: number | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: number | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: number | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: number | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
        }
        Relationships: []
      }
      mcq_with_options: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: boolean | null
          code: string | null
          corrected: boolean | null
          difficulty: number | null
          option1: string | null
          option2: string | null
          option3: string | null
          option4: string | null
          problem_image: string | null
          problem_number: number | null
          problem_text: string | null
          question_id: string
          rec_time: string | null
          skills: number | null
          skills_for_step_1: string | null
          skills_for_step_10: string | null
          skills_for_step_11: string | null
          skills_for_step_12: string | null
          skills_for_step_13: string | null
          skills_for_step_14: string | null
          skills_for_step_15: string | null
          skills_for_step_2: string | null
          skills_for_step_3: string | null
          skills_for_step_4: string | null
          skills_for_step_5: string | null
          skills_for_step_6: string | null
          skills_for_step_7: string | null
          skills_for_step_8: string | null
          skills_for_step_9: string | null
          solution_text: string | null
          solutiontextexpanded: string | null
          source: string | null
          step1_expanded_text: string | null
          step1_text: string | null
          step10_expanded_text: string | null
          step10_text: string | null
          step11_expanded_text: string | null
          step11_text: string | null
          step12_expanded_text: string | null
          step12_text: string | null
          step13_expanded_text: string | null
          step13_text: string | null
          step14_expanded_text: string | null
          step14_text: string | null
          step15_expanded_text: string | null
          step15_text: string | null
          step2_expanded_text: string | null
          step2_text: string | null
          step3_expanded_text: string | null
          step3_text: string | null
          step4_expanded_text: string | null
          step4_text: string | null
          step5_expanded_text: string | null
          step5_text: string | null
          step6_expanded_text: string | null
          step6_text: string | null
          step7_expanded_text: string | null
          step7_text: string | null
          step8_expanded_text: string | null
          step8_text: string | null
          step9_expanded_text: string | null
          step9_text: string | null
          steps_number: number | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          option4?: string | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id: string
          rec_time?: string | null
          skills?: number | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: boolean | null
          code?: string | null
          corrected?: boolean | null
          difficulty?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          option4?: string | null
          problem_image?: string | null
          problem_number?: number | null
          problem_text?: string | null
          question_id?: string
          rec_time?: string | null
          skills?: number | null
          skills_for_step_1?: string | null
          skills_for_step_10?: string | null
          skills_for_step_11?: string | null
          skills_for_step_12?: string | null
          skills_for_step_13?: string | null
          skills_for_step_14?: string | null
          skills_for_step_15?: string | null
          skills_for_step_2?: string | null
          skills_for_step_3?: string | null
          skills_for_step_4?: string | null
          skills_for_step_5?: string | null
          skills_for_step_6?: string | null
          skills_for_step_7?: string | null
          skills_for_step_8?: string | null
          skills_for_step_9?: string | null
          solution_text?: string | null
          solutiontextexpanded?: string | null
          source?: string | null
          step1_expanded_text?: string | null
          step1_text?: string | null
          step10_expanded_text?: string | null
          step10_text?: string | null
          step11_expanded_text?: string | null
          step11_text?: string | null
          step12_expanded_text?: string | null
          step12_text?: string | null
          step13_expanded_text?: string | null
          step13_text?: string | null
          step14_expanded_text?: string | null
          step14_text?: string | null
          step15_expanded_text?: string | null
          step15_text?: string | null
          step2_expanded_text?: string | null
          step2_text?: string | null
          step3_expanded_text?: string | null
          step3_text?: string | null
          step4_expanded_text?: string | null
          step4_text?: string | null
          step5_expanded_text?: string | null
          step5_text?: string | null
          step6_expanded_text?: string | null
          step6_text?: string | null
          step7_expanded_text?: string | null
          step7_text?: string | null
          step8_expanded_text?: string | null
          step8_text?: string | null
          step9_expanded_text?: string | null
          step9_text?: string | null
          steps_number?: number | null
          type?: string | null
        }
        Relationships: []
      }
      new_articles: {
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
      oge_math_fipi_bank_GOOD_OLD: {
        Row: {
          answer: string | null
          calculation_required: string | null
          calculator_allowed: string | null
          checked: number | null
          code: number | null
          comments: string | null
          corrected: string | null
          difficulty: number | null
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
          steps_number: number | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: number | null
          code?: number | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
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
          steps_number?: number | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          calculation_required?: string | null
          calculator_allowed?: string | null
          checked?: number | null
          code?: number | null
          comments?: string | null
          corrected?: string | null
          difficulty?: number | null
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
          steps_number?: number | null
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
      read_articles: {
        Row: {
          created_at: string | null
          date_read: string | null
          id: string
          skill_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_read?: string | null
          id?: string
          skill_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_read?: string | null
          id?: string
          skill_id?: number
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
      student_skills: {
        Row: {
          created_at: string | null
          skill_1: number | null
          skill_10: number | null
          skill_100: number | null
          skill_101: number | null
          skill_102: number | null
          skill_103: number | null
          skill_104: number | null
          skill_105: number | null
          skill_106: number | null
          skill_107: number | null
          skill_108: number | null
          skill_109: number | null
          skill_11: number | null
          skill_110: number | null
          skill_111: number | null
          skill_112: number | null
          skill_113: number | null
          skill_114: number | null
          skill_115: number | null
          skill_116: number | null
          skill_117: number | null
          skill_118: number | null
          skill_119: number | null
          skill_12: number | null
          skill_120: number | null
          skill_121: number | null
          skill_122: number | null
          skill_123: number | null
          skill_124: number | null
          skill_125: number | null
          skill_126: number | null
          skill_127: number | null
          skill_128: number | null
          skill_129: number | null
          skill_13: number | null
          skill_130: number | null
          skill_131: number | null
          skill_132: number | null
          skill_133: number | null
          skill_134: number | null
          skill_135: number | null
          skill_136: number | null
          skill_137: number | null
          skill_138: number | null
          skill_139: number | null
          skill_14: number | null
          skill_140: number | null
          skill_141: number | null
          skill_142: number | null
          skill_143: number | null
          skill_144: number | null
          skill_145: number | null
          skill_146: number | null
          skill_147: number | null
          skill_148: number | null
          skill_149: number | null
          skill_15: number | null
          skill_150: number | null
          skill_151: number | null
          skill_152: number | null
          skill_153: number | null
          skill_154: number | null
          skill_155: number | null
          skill_156: number | null
          skill_157: number | null
          skill_158: number | null
          skill_159: number | null
          skill_16: number | null
          skill_160: number | null
          skill_161: number | null
          skill_162: number | null
          skill_163: number | null
          skill_164: number | null
          skill_165: number | null
          skill_166: number | null
          skill_167: number | null
          skill_168: number | null
          skill_169: number | null
          skill_17: number | null
          skill_170: number | null
          skill_171: number | null
          skill_172: number | null
          skill_173: number | null
          skill_174: number | null
          skill_175: number | null
          skill_176: number | null
          skill_177: number | null
          skill_178: number | null
          skill_179: number | null
          skill_18: number | null
          skill_180: number | null
          skill_181: number | null
          skill_19: number | null
          skill_2: number | null
          skill_20: number | null
          skill_21: number | null
          skill_22: number | null
          skill_23: number | null
          skill_24: number | null
          skill_25: number | null
          skill_26: number | null
          skill_27: number | null
          skill_28: number | null
          skill_29: number | null
          skill_3: number | null
          skill_30: number | null
          skill_31: number | null
          skill_32: number | null
          skill_33: number | null
          skill_34: number | null
          skill_35: number | null
          skill_36: number | null
          skill_37: number | null
          skill_38: number | null
          skill_39: number | null
          skill_4: number | null
          skill_40: number | null
          skill_41: number | null
          skill_42: number | null
          skill_43: number | null
          skill_44: number | null
          skill_45: number | null
          skill_46: number | null
          skill_47: number | null
          skill_48: number | null
          skill_49: number | null
          skill_5: number | null
          skill_50: number | null
          skill_51: number | null
          skill_52: number | null
          skill_53: number | null
          skill_54: number | null
          skill_55: number | null
          skill_56: number | null
          skill_57: number | null
          skill_58: number | null
          skill_59: number | null
          skill_6: number | null
          skill_60: number | null
          skill_61: number | null
          skill_62: number | null
          skill_63: number | null
          skill_64: number | null
          skill_65: number | null
          skill_66: number | null
          skill_67: number | null
          skill_68: number | null
          skill_69: number | null
          skill_7: number | null
          skill_70: number | null
          skill_71: number | null
          skill_72: number | null
          skill_73: number | null
          skill_74: number | null
          skill_75: number | null
          skill_76: number | null
          skill_77: number | null
          skill_78: number | null
          skill_79: number | null
          skill_8: number | null
          skill_80: number | null
          skill_81: number | null
          skill_82: number | null
          skill_83: number | null
          skill_84: number | null
          skill_85: number | null
          skill_86: number | null
          skill_87: number | null
          skill_88: number | null
          skill_89: number | null
          skill_9: number | null
          skill_90: number | null
          skill_91: number | null
          skill_92: number | null
          skill_93: number | null
          skill_94: number | null
          skill_95: number | null
          skill_96: number | null
          skill_97: number | null
          skill_98: number | null
          skill_99: number | null
          uid: string
        }
        Insert: {
          created_at?: string | null
          skill_1?: number | null
          skill_10?: number | null
          skill_100?: number | null
          skill_101?: number | null
          skill_102?: number | null
          skill_103?: number | null
          skill_104?: number | null
          skill_105?: number | null
          skill_106?: number | null
          skill_107?: number | null
          skill_108?: number | null
          skill_109?: number | null
          skill_11?: number | null
          skill_110?: number | null
          skill_111?: number | null
          skill_112?: number | null
          skill_113?: number | null
          skill_114?: number | null
          skill_115?: number | null
          skill_116?: number | null
          skill_117?: number | null
          skill_118?: number | null
          skill_119?: number | null
          skill_12?: number | null
          skill_120?: number | null
          skill_121?: number | null
          skill_122?: number | null
          skill_123?: number | null
          skill_124?: number | null
          skill_125?: number | null
          skill_126?: number | null
          skill_127?: number | null
          skill_128?: number | null
          skill_129?: number | null
          skill_13?: number | null
          skill_130?: number | null
          skill_131?: number | null
          skill_132?: number | null
          skill_133?: number | null
          skill_134?: number | null
          skill_135?: number | null
          skill_136?: number | null
          skill_137?: number | null
          skill_138?: number | null
          skill_139?: number | null
          skill_14?: number | null
          skill_140?: number | null
          skill_141?: number | null
          skill_142?: number | null
          skill_143?: number | null
          skill_144?: number | null
          skill_145?: number | null
          skill_146?: number | null
          skill_147?: number | null
          skill_148?: number | null
          skill_149?: number | null
          skill_15?: number | null
          skill_150?: number | null
          skill_151?: number | null
          skill_152?: number | null
          skill_153?: number | null
          skill_154?: number | null
          skill_155?: number | null
          skill_156?: number | null
          skill_157?: number | null
          skill_158?: number | null
          skill_159?: number | null
          skill_16?: number | null
          skill_160?: number | null
          skill_161?: number | null
          skill_162?: number | null
          skill_163?: number | null
          skill_164?: number | null
          skill_165?: number | null
          skill_166?: number | null
          skill_167?: number | null
          skill_168?: number | null
          skill_169?: number | null
          skill_17?: number | null
          skill_170?: number | null
          skill_171?: number | null
          skill_172?: number | null
          skill_173?: number | null
          skill_174?: number | null
          skill_175?: number | null
          skill_176?: number | null
          skill_177?: number | null
          skill_178?: number | null
          skill_179?: number | null
          skill_18?: number | null
          skill_180?: number | null
          skill_181?: number | null
          skill_19?: number | null
          skill_2?: number | null
          skill_20?: number | null
          skill_21?: number | null
          skill_22?: number | null
          skill_23?: number | null
          skill_24?: number | null
          skill_25?: number | null
          skill_26?: number | null
          skill_27?: number | null
          skill_28?: number | null
          skill_29?: number | null
          skill_3?: number | null
          skill_30?: number | null
          skill_31?: number | null
          skill_32?: number | null
          skill_33?: number | null
          skill_34?: number | null
          skill_35?: number | null
          skill_36?: number | null
          skill_37?: number | null
          skill_38?: number | null
          skill_39?: number | null
          skill_4?: number | null
          skill_40?: number | null
          skill_41?: number | null
          skill_42?: number | null
          skill_43?: number | null
          skill_44?: number | null
          skill_45?: number | null
          skill_46?: number | null
          skill_47?: number | null
          skill_48?: number | null
          skill_49?: number | null
          skill_5?: number | null
          skill_50?: number | null
          skill_51?: number | null
          skill_52?: number | null
          skill_53?: number | null
          skill_54?: number | null
          skill_55?: number | null
          skill_56?: number | null
          skill_57?: number | null
          skill_58?: number | null
          skill_59?: number | null
          skill_6?: number | null
          skill_60?: number | null
          skill_61?: number | null
          skill_62?: number | null
          skill_63?: number | null
          skill_64?: number | null
          skill_65?: number | null
          skill_66?: number | null
          skill_67?: number | null
          skill_68?: number | null
          skill_69?: number | null
          skill_7?: number | null
          skill_70?: number | null
          skill_71?: number | null
          skill_72?: number | null
          skill_73?: number | null
          skill_74?: number | null
          skill_75?: number | null
          skill_76?: number | null
          skill_77?: number | null
          skill_78?: number | null
          skill_79?: number | null
          skill_8?: number | null
          skill_80?: number | null
          skill_81?: number | null
          skill_82?: number | null
          skill_83?: number | null
          skill_84?: number | null
          skill_85?: number | null
          skill_86?: number | null
          skill_87?: number | null
          skill_88?: number | null
          skill_89?: number | null
          skill_9?: number | null
          skill_90?: number | null
          skill_91?: number | null
          skill_92?: number | null
          skill_93?: number | null
          skill_94?: number | null
          skill_95?: number | null
          skill_96?: number | null
          skill_97?: number | null
          skill_98?: number | null
          skill_99?: number | null
          uid: string
        }
        Update: {
          created_at?: string | null
          skill_1?: number | null
          skill_10?: number | null
          skill_100?: number | null
          skill_101?: number | null
          skill_102?: number | null
          skill_103?: number | null
          skill_104?: number | null
          skill_105?: number | null
          skill_106?: number | null
          skill_107?: number | null
          skill_108?: number | null
          skill_109?: number | null
          skill_11?: number | null
          skill_110?: number | null
          skill_111?: number | null
          skill_112?: number | null
          skill_113?: number | null
          skill_114?: number | null
          skill_115?: number | null
          skill_116?: number | null
          skill_117?: number | null
          skill_118?: number | null
          skill_119?: number | null
          skill_12?: number | null
          skill_120?: number | null
          skill_121?: number | null
          skill_122?: number | null
          skill_123?: number | null
          skill_124?: number | null
          skill_125?: number | null
          skill_126?: number | null
          skill_127?: number | null
          skill_128?: number | null
          skill_129?: number | null
          skill_13?: number | null
          skill_130?: number | null
          skill_131?: number | null
          skill_132?: number | null
          skill_133?: number | null
          skill_134?: number | null
          skill_135?: number | null
          skill_136?: number | null
          skill_137?: number | null
          skill_138?: number | null
          skill_139?: number | null
          skill_14?: number | null
          skill_140?: number | null
          skill_141?: number | null
          skill_142?: number | null
          skill_143?: number | null
          skill_144?: number | null
          skill_145?: number | null
          skill_146?: number | null
          skill_147?: number | null
          skill_148?: number | null
          skill_149?: number | null
          skill_15?: number | null
          skill_150?: number | null
          skill_151?: number | null
          skill_152?: number | null
          skill_153?: number | null
          skill_154?: number | null
          skill_155?: number | null
          skill_156?: number | null
          skill_157?: number | null
          skill_158?: number | null
          skill_159?: number | null
          skill_16?: number | null
          skill_160?: number | null
          skill_161?: number | null
          skill_162?: number | null
          skill_163?: number | null
          skill_164?: number | null
          skill_165?: number | null
          skill_166?: number | null
          skill_167?: number | null
          skill_168?: number | null
          skill_169?: number | null
          skill_17?: number | null
          skill_170?: number | null
          skill_171?: number | null
          skill_172?: number | null
          skill_173?: number | null
          skill_174?: number | null
          skill_175?: number | null
          skill_176?: number | null
          skill_177?: number | null
          skill_178?: number | null
          skill_179?: number | null
          skill_18?: number | null
          skill_180?: number | null
          skill_181?: number | null
          skill_19?: number | null
          skill_2?: number | null
          skill_20?: number | null
          skill_21?: number | null
          skill_22?: number | null
          skill_23?: number | null
          skill_24?: number | null
          skill_25?: number | null
          skill_26?: number | null
          skill_27?: number | null
          skill_28?: number | null
          skill_29?: number | null
          skill_3?: number | null
          skill_30?: number | null
          skill_31?: number | null
          skill_32?: number | null
          skill_33?: number | null
          skill_34?: number | null
          skill_35?: number | null
          skill_36?: number | null
          skill_37?: number | null
          skill_38?: number | null
          skill_39?: number | null
          skill_4?: number | null
          skill_40?: number | null
          skill_41?: number | null
          skill_42?: number | null
          skill_43?: number | null
          skill_44?: number | null
          skill_45?: number | null
          skill_46?: number | null
          skill_47?: number | null
          skill_48?: number | null
          skill_49?: number | null
          skill_5?: number | null
          skill_50?: number | null
          skill_51?: number | null
          skill_52?: number | null
          skill_53?: number | null
          skill_54?: number | null
          skill_55?: number | null
          skill_56?: number | null
          skill_57?: number | null
          skill_58?: number | null
          skill_59?: number | null
          skill_6?: number | null
          skill_60?: number | null
          skill_61?: number | null
          skill_62?: number | null
          skill_63?: number | null
          skill_64?: number | null
          skill_65?: number | null
          skill_66?: number | null
          skill_67?: number | null
          skill_68?: number | null
          skill_69?: number | null
          skill_7?: number | null
          skill_70?: number | null
          skill_71?: number | null
          skill_72?: number | null
          skill_73?: number | null
          skill_74?: number | null
          skill_75?: number | null
          skill_76?: number | null
          skill_77?: number | null
          skill_78?: number | null
          skill_79?: number | null
          skill_8?: number | null
          skill_80?: number | null
          skill_81?: number | null
          skill_82?: number | null
          skill_83?: number | null
          skill_84?: number | null
          skill_85?: number | null
          skill_86?: number | null
          skill_87?: number | null
          skill_88?: number | null
          skill_89?: number | null
          skill_9?: number | null
          skill_90?: number | null
          skill_91?: number | null
          skill_92?: number | null
          skill_93?: number | null
          skill_94?: number | null
          skill_95?: number | null
          skill_96?: number | null
          skill_97?: number | null
          skill_98?: number | null
          skill_99?: number | null
          uid?: string
        }
        Relationships: []
      }
      telegram_uploads: {
        Row: {
          created_at: string | null
          extracted_text: string | null
          id: number
          problem_submission_id: string
          telegram_upload_content: string
          telegram_user_id: number
        }
        Insert: {
          created_at?: string | null
          extracted_text?: string | null
          id?: number
          problem_submission_id: string
          telegram_upload_content: string
          telegram_user_id: number
        }
        Update: {
          created_at?: string | null
          extracted_text?: string | null
          id?: number
          problem_submission_id?: string
          telegram_upload_content?: string
          telegram_user_id?: number
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
      user_activities: {
        Row: {
          activity_id: string
          activity_type: string
          completed_at: string
          id: string
          points_earned: number
          subunit_number: number | null
          time_spent_minutes: number | null
          unit_number: number
          user_id: string
        }
        Insert: {
          activity_id: string
          activity_type: string
          completed_at?: string
          id?: string
          points_earned?: number
          subunit_number?: number | null
          time_spent_minutes?: number | null
          unit_number: number
          user_id: string
        }
        Update: {
          activity_id?: string
          activity_type?: string
          completed_at?: string
          id?: string
          points_earned?: number
          subunit_number?: number | null
          time_spent_minutes?: number | null
          unit_number?: number
          user_id?: string
        }
        Relationships: []
      }
      user_mastery: {
        Row: {
          created_at: string
          id: string
          mastery_level: string
          mastery_points: number
          subunit_number: number | null
          total_possible_points: number
          unit_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mastery_level?: string
          mastery_points?: number
          subunit_number?: number | null
          total_possible_points?: number
          unit_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mastery_level?: string
          mastery_points?: number
          subunit_number?: number | null
          total_possible_points?: number
          unit_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
