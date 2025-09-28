import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Hash, RefreshCw } from "lucide-react";

const OgemathPractice = () => {
  const questionTypes = [
    {
      title: "По номеру вопроса",
      description: "Практика всех вопросов выбранного номера (1-25)",
      icon: Hash,
      link: "/practice-by-number-ogemath",
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
    },
    {
      title: "По теме",
      description: "Практика по конкретным темам и экзаменам",
      icon: ClipboardList,
      link: "/new-practice-skills",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200"
    },
    {
      title: "Повторение",
      description: "Практика навыков, которые нужно подтянуть - супер полезно!",
      icon: RefreshCw,
      link: "/ogemath-revision",
      color: "bg-green-50 hover:bg-green-100 border-green-200"
    },
    {
      title: "Домашнее задание",
      description: "Персональные задания от ИИ помощника - MCQ и ФИПИ",
      icon: ClipboardList,
      link: "/homework",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200"
    },
    {
      title: "Пробный экзамен ОГЭ",
      description: "Полный экзамен с таймером (3ч 55мин) - 25 вопросов",
      icon: ClipboardList,
      link: "/ogemath-mock",
      color: "bg-red-50 hover:bg-red-100 border-red-200"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-start">
            <Link to="/ogemath">
              <Button className="bg-gradient-to-r from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-400 text-black shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                Назад
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="pt-8 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Практика ОГЭ</h1>
            <p className="text-lg text-gray-600">Выберите тип практики для изучения математики</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {questionTypes.map((type) => (
              <Link key={type.title} to={type.link}>
                <Card className={`h-full transition-all duration-200 ${type.color} hover:shadow-lg hover:scale-105`}>
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <type.icon className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {type.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600">{type.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OgemathPractice;