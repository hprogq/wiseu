import DluflUndergradService from './DluflUndergradService';
import { IdentityProvider, IdentityConstructor } from '../../providers/IdentityProvider';

class IdentityRegistry {
    public static registry: { [key: string]: IdentityConstructor } = {
        dlufl_undergrad: DluflUndergradService,
    };

    static getIdentity(type: string): IdentityConstructor {
        const ServiceClass = this.registry[type];
        if (!ServiceClass) {
            throw new Error(`Service ${type} not found in registry.`);
        }
        return ServiceClass;
    }

    static registerIdentity(type: string, serviceClass: IdentityConstructor): void {
        this.registry[type] = serviceClass;
    }
}

export default IdentityRegistry;