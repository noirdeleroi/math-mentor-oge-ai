import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormulaBookletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'oge' | 'ege-basic';
}

const FormulaBookletDialog = ({ open, onOpenChange, mode = 'oge' }: FormulaBookletDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{mode === 'ege-basic' ? 'Справочник формул ЕГЭ (База)' : 'Справочник формул ОГЭ'}</DialogTitle>
        </DialogHeader>
        {mode === 'ege-basic' ? (
          <Tabs defaultValue="p1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="p1">Страница 1</TabsTrigger>
              <TabsTrigger value="p2">Страница 2</TabsTrigger>
            </TabsList>
            <TabsContent value="p1" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <img 
                  src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/Formulas/egebasic1.png" 
                  alt="ЕГЭ База — Стр.1 (левая)"
                  className="w-full h-auto rounded-lg shadow-sm"
                />
                <img 
                  src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/Formulas/egebasic2.png" 
                  alt="ЕГЭ База — Стр.1 (правая)"
                  className="w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            </TabsContent>
            <TabsContent value="p2" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <img 
                  src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/Formulas/egebasic3.png" 
                  alt="ЕГЭ База — Стр.2 (левая)"
                  className="w-full h-auto rounded-lg shadow-sm"
                />
                <img 
                  src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/Formulas/egebasic4.png" 
                  alt="ЕГЭ База — Стр.2 (правая)"
                  className="w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="algebra" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="algebra">Алгебра</TabsTrigger>
              <TabsTrigger value="geometry">Геометрия</TabsTrigger>
            </TabsList>
            <TabsContent value="algebra" className="mt-4">
              <div className="flex justify-center">
                <img 
                  src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/Formulas/oge_f1.jpg" 
                  alt="Формулы алгебры ОГЭ"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            </TabsContent>
            <TabsContent value="geometry" className="mt-4">
              <div className="flex justify-center">
                <img 
                  src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/Formulas/oge_f2.jpg" 
                  alt="Формулы геометрии ОГЭ"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FormulaBookletDialog;