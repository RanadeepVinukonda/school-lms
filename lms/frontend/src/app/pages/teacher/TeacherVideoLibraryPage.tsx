import { useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, cardStackReveal } from '@/lib/motion';
import { SearchYouTubeTab } from './TeacherVideoLibrary/SearchYouTubeTab';
import { MyLibraryTab } from './TeacherVideoLibrary/MyLibraryTab';
import { AttachToConceptTab } from './TeacherVideoLibrary/AttachToConceptTab';

export default function TeacherVideoLibraryPage() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <>
      <SEOHead
        title="Video Library"
        description="Search, save, and manage educational videos for your classroom"
        canonical="/teacher/videos"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">Video Library</h1>
          </div>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full overflow-x-auto inline-flex">
              <TabsTrigger value="search" className="gap-2">
                <Icon name="search" size={16} />
                <span className="hidden sm:inline">Search YouTube</span>
                <span className="sm:hidden">Search</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-2">
                <Icon name="video_library" size={16} />
                <span className="hidden sm:inline">My Library</span>
                <span className="sm:hidden">Library</span>
              </TabsTrigger>
              <TabsTrigger value="attach" className="gap-2">
                <Icon name="attach_file" size={16} />
                <span className="hidden sm:inline">Attach to Concept</span>
                <span className="sm:hidden">Attach</span>
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
        </motion.div>
      </motion.div>
    </>
  );
}
