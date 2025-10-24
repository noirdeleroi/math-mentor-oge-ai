import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, MapPin, Clock, Users, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  experience: number;
  specialization: string[];
  location: string;
  hourlyRate: number;
  studentsCount: number;
  description: string;
  availability: string;
}

const aiTutors: Teacher[] = [
  {
    id: "1",
    name: "Ёжик",
    avatar: "https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/avatars/egik.png",
    rating: 4.9,
    experience: 1000,
    specialization: ["ОГЭ", "ЕГЭ", "Алгебра", "Геометрия"],
    location: "Онлайн",
    hourlyRate: 0,
    studentsCount: 50000,
    description:
      "Дружелюбный и терпеливый AI-наставник. Превращаю сложные математические концепции в простые объяснения с примерами из жизни.",
    availability: "24/7",
  },
  {
    id: "2",
    name: "Кеnji",
    avatar: "https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/avatars/anime_guy.png",
    rating: 4.8,
    experience: 500,
    specialization: ["ЕГЭ", "Профильная математика", "Логика"],
    location: "Онлайн",
    hourlyRate: 0,
    studentsCount: 25000,
    description:
      "Строгий, но справедливый AI-преподаватель. Использую структурированный подход и четкие алгоритмы решения задач.",
    availability: "24/7",
  },
  {
    id: "3",
    name: "Сакура",
    avatar: "https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/avatars/anime_girl.png",
    rating: 4.7,
    experience: 300,
    specialization: ["ОГЭ", "Базовая математика", "Мотивация"],
    location: "Онлайн",
    hourlyRate: 0,
    studentsCount: 30000,
    description:
      "Веселая и вдохновляющая AI-учительница. Помогаю преодолеть страх перед математикой и делаю обучение увлекательным!",
    availability: "24/7",
  },
];

export const TeacherTab = () => {
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [showThankYouModal, setShowThankYouModal] = useState<boolean>(false);
  const [selectedTutorMessage, setSelectedTutorMessage] = useState<string>("");
  const { user } = useAuth();

  const getTutorMessage = (teacherId: string) => {
    switch (teacherId) {
      case "1":
        return "Спасибо, что выбрали меня! Я помогу вам полюбить математику и сделаю обучение увлекательным. Вместе мы достигнем ваших целей! 🦔";
      case "2":
        return "Благодарю за выбор! Я научу вас решать задачи с точностью и уверенностью. Дисциплина и упорство - ключ к успеху!";
      case "3":
        return "Ура! Как здорово, что вы выбрали меня! Мы будем изучать математику с радостью и энтузиазмом. Давайте сделаем обучение веселым! ✨";
      default:
        return "Спасибо за выбор!";
    }
  };

  // ✅ UPDATED FUNCTION: saves both tutor_avatar_url and tutor_name
  const handleSelectTeacher = async (teacherId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему для выбора наставника",
        variant: "destructive",
      });
      return;
    }

    const selectedTutor = aiTutors.find((tutor) => tutor.id === teacherId);
    if (!selectedTutor) return;

    try {
      // Update tutor_avatar_url, tutor_name, and tutor_id in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({
          tutor_avatar_url: selectedTutor.avatar,
          tutor_name: selectedTutor.name,
          tutor_id: selectedTutor.id,
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating tutor selection:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить выбор наставника",
          variant: "destructive",
        });
        return;
      }

      setSelectedTeacher(teacherId);
      setSelectedTutorMessage(getTutorMessage(teacherId));
      setShowThankYouModal(true);

      toast({
        title: "Успешно!",
        description: `Вы выбрали ${selectedTutor.name} в качестве своего AI-наставника`,
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Ошибка",
        description: "Произошла неожиданная ошибка",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Выбор AI-наставника</h2>
        <p className="text-sm md:text-base text-white px-4">
          Выберите AI-наставника, который подходит вашему стилю обучения
        </p>
      </div>

      <div className="grid gap-4 md:gap-6">
        {aiTutors.map((teacher) => (
          <Card
            key={teacher.id}
            className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
              selectedTeacher === teacher.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleSelectTeacher(teacher.id)}
          >
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                <Avatar className="w-12 h-12 md:w-16 md:h-16 mx-auto md:mx-0">
                  <AvatarImage src={teacher.avatar} alt={teacher.name} />
                  <AvatarFallback>
                    {teacher.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                    <CardTitle className="text-lg md:text-xl text-center md:text-left">{teacher.name}</CardTitle>
                    <div className="flex items-center justify-center md:justify-end gap-1 mt-1 md:mt-0">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm md:text-base">{teacher.rating}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:flex md:items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-600">
                    <div className="flex items-center justify-center md:justify-start gap-1">
                      <Clock className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{teacher.experience} лет опыта</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-1">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{teacher.location}</span>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-1">
                      <Users className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{teacher.studentsCount} учеников</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                    {teacher.specialization.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 pt-0">
              <p className="text-sm md:text-base text-gray-700 mb-4 text-center md:text-left">{teacher.description}</p>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-center md:text-left space-y-1">
                  <div className="text-xs md:text-sm text-gray-600">Доступность:</div>
                  <div className="text-sm md:text-base font-medium">{teacher.availability}</div>
                </div>

                <div className="text-center md:text-right space-y-1">
                  <div className="text-xl md:text-2xl font-bold text-primary">Бесплатно</div>
                  <div className="text-xs md:text-sm text-gray-600">всегда</div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-4">
                <Button
                  className="w-full md:flex-1"
                  variant={selectedTeacher === teacher.id ? "default" : "outline"}
                  size="sm"
                >
                  {selectedTeacher === teacher.id ? "Выбран" : "Выбрать"}
                </Button>
                <Button variant="outline" size="sm" className="w-full md:w-auto">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Чат
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTeacher && (
        <Card className="bg-gradient-to-r from-primary/10 to-purple-100 border-primary/20">
          <CardContent className="p-4 md:p-6">
            <div className="text-center">
              <h3 className="text-base md:text-lg font-semibold mb-2">AI-наставник выбран!</h3>
              <p className="text-sm md:text-base text-gray-600 mb-4 px-2">
                Теперь ваш персональный AI-наставник готов помочь вам в изучении математики
              </p>
              <Button className="w-full md:w-auto" size="sm">Начать обучение</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showThankYouModal} onOpenChange={setShowThankYouModal}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base md:text-lg">
              <span>Ваш AI-наставник</span>
              <Button variant="ghost" size="icon" onClick={() => setShowThankYouModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            {selectedTeacher && (
              <>
                <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto">
                  <AvatarImage
                    src={aiTutors.find((t) => t.id === selectedTeacher)?.avatar}
                    alt="Выбранный наставник"
                  />
                  <AvatarFallback>
                    {aiTutors.find((t) => t.id === selectedTeacher)?.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-base md:text-lg font-semibold">
                    {aiTutors.find((t) => t.id === selectedTeacher)?.name}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed px-2">{selectedTutorMessage}</p>
                </div>
                <Button className="w-full" size="sm" onClick={() => setShowThankYouModal(false)}>
                  Начать обучение
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
