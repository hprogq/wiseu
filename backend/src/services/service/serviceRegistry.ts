import { ServiceProvider, ServiceConstructor } from '../../providers/ServiceProvider';
import DluflLibraryService from './DluflLibraryService';
import DluflKnowledgeService from "./DluflKnowledgeService";
import DluflTimetableService from "./DluflTimetableService";

class ServiceRegistry {
    public static registry: { [key: string]: ServiceConstructor } = {
        dlufl_library: DluflLibraryService,
        dlufl_knowledge: DluflKnowledgeService,
        dlufl_timetable: DluflTimetableService
    };

    static getService(type: string): ServiceConstructor {
        const ServiceClass = this.registry[type];
        if (!ServiceClass) {
            throw new Error(`Service ${type} not found in registry.`);
        }
        return ServiceClass;
    }

    static registerService(type: string, serviceClass: ServiceConstructor): void {
        this.registry[type] = serviceClass;
    }
}

export default ServiceRegistry;