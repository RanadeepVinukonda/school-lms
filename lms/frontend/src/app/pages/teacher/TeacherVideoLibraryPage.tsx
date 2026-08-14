import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { SearchYouTubeTab } from './TeacherVideoLibrary/SearchYouTubeTab';
import { MyLibraryTab } from './TeacherVideoLibrary/MyLibraryTab';
import { AttachToConceptTab } from './TeacherVideoLibrary/AttachToConceptTab';

export default function TeacherVideoLibraryPage() {
  const { _ } = useTranslation();
  const [activeTab, setActiveTab] = useState('search');

  return (
    <>
      <SEOHead
        title={_('Video Library')}
        description={_('Search, save, and manage educational videos for your classroom')}
        canonical="/teacher/videos"
      />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">{_('Video Library')}</h1>
          </div>
        </div>

        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full overflow-x-auto inline-flex">
              <TabsTrigger value="search" className="gap-2">
                <Icon name="search" size={16} />
                <span className="hidden sm:inline">{_('Search Educational Videos')}</span>
                <span className="sm:hidden">{_('Search')}</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-2">
                <Icon name="video_library" size={16} />
                <span className="hidden sm:inline">{_('My Library')}</span>
                <span className="sm:hidden">{_('Library')}</span>
              </TabsTrigger>
              <TabsTrigger value="attach" className="gap-2">
                <Icon name="attach_file" size={16} />
                <span className="hidden sm:inline">{_('Attach to Concept')}</span>
                <span className="sm:hidden">{_('Attach')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-6">
              <SearchYouTubeTab />
            </TabsContent>

            <TabsContent value="library" className="mt-6">
              <MyLibraryTab onTabChange={setActiveTab} />
            </TabsContent>

            <TabsContent value="attach" className="mt-6">
              <AttachToConceptTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
