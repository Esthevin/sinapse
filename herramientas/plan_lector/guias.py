"""Guías de lectura de obras del plan lector que todavía tienen derechos de autor.

    python herramientas/plan_lector/guias.py

Sinapse no puede incluir el texto de Yawar Fiesta, El sueño del pongo, Los ríos profundos ni La ciudad y los perros
(Arguedas murió en 1969 y su obra entra al dominio público en el Perú recién en 2040; Vargas Llosa tiene derechos
vigentes). Estas guías están escritas por el equipo: contexto, argumento contado con nuestras palabras, personajes,
temas y claves para leer la obra. No copian pasajes del libro. Escribe textos/<id>.es.json y la entrada en obras.json;
después se traducen (traducir_nllb.py) y se narran (generar_mms.py) como cualquier obra del plan lector.
"""
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent

NOTA = ("Esta guía no reemplaza la obra: no copia su texto, que tiene derechos de autor. Léela completa en la "
        "biblioteca de tu colegio, en una biblioteca pública o en una edición autorizada.")

GUIAS = {
    "guia-yawar-fiesta": {
        "title": "Guía de lectura: Yawar Fiesta",
        "author": "José María Arguedas (guía de Sinapse)",
        "region": "sierra",
        "coverColor": "#7A2E1F",
        "summary": "Guía para leer la primera novela de Arguedas (1941): en Puquio, los comuneros defienden su corrida de toros a la manera andina, el yawar punchay, contra la orden de prohibirla. Contexto, personajes, temas y preguntas.",
        "texto": [
            "Yawar Fiesta es la primera novela de José María Arguedas. Se publicó en 1941. Su título mezcla el quechua y el castellano: yawar quiere decir sangre, así que el título se puede leer como «fiesta de sangre».",
            "Arguedas nació en Andahuaylas, Apurímac, en 1911. Su madre murió cuando él era muy pequeño y pasó parte de su niñez entre los trabajadores indígenas de la hacienda de su madrastra. Allí aprendió el quechua antes que el castellano. Por eso, cuando escribe sobre los Andes, no mira desde afuera: cuenta un mundo que conoció por dentro.",
            "La novela ocurre en Puquio, un pueblo de Lucanas, en Ayacucho. El pueblo está dividido en cuatro barrios o ayllus: Pichk'achuri, K'ayau, Chaupi y K'ollana. Cada ayllu tiene su orgullo y sus autoridades. Arriba, en la puna, viven los comuneros que han perdido tierras y pastos a manos de los vecinos ricos, a quienes la novela llama mistis.",
            "Todos los años, para las fiestas patrias del 28 de julio, Puquio celebra una corrida a la manera andina. No hay un torero profesional: los comuneros entran a la plaza a enfrentar al toro con sus ponchos, con valor y, a veces, con dinamita. Es peligrosa y puede haber muertos, y para el pueblo eso forma parte del sentido de la fiesta.",
            "Ese año llega una orden del gobierno: prohibir la corrida «india» por bárbara y reemplazarla por una corrida «a la española», con un torero traído de Lima. El subprefecto debe hacerla cumplir. Algunos vecinos notables lo apoyan. Un grupo de jóvenes puquianos que vive en Lima y se ha educado allí también, porque cree que así su pueblo progresa.",
            "Los comuneros no aceptan. El ayllu de K'ayau decide traer para la fiesta al Misitu, un toro salvaje y casi legendario que vive en las alturas de K'oñani y al que nadie ha podido dominar. Atraparlo es una hazaña colectiva. Toda la comunidad trabaja, sube a la puna y arriesga la vida para llevarlo al pueblo.",
            "La novela también muestra otro trabajo colectivo: los comuneros construyen una carretera de Puquio a la costa en muy poco tiempo, sin ayuda del Estado. Arguedas usa ese episodio para mostrar la fuerza y la organización de las comunidades, que los poderosos suelen despreciar.",
            "Al final, el torero contratado no logra dominar a los toros andinos y los comuneros entran a la plaza como siempre. La fiesta ocurre a su manera, con sangre. Las autoridades no pueden detenerla.",
            "Personajes y grupos para seguir: los comuneros de los ayllus, con sus varayok' o autoridades tradicionales; el subprefecto, que representa al Estado; los mistis o vecinos ricos, como el hacendado dueño del Misitu; y los estudiantes puquianos de Lima, que quieren cambiar la fiesta desde afuera.",
            "Temas: la defensa de la cultura propia frente a una ley que la desprecia; el despojo de tierras; la fuerza del trabajo comunal; y la mirada de los de afuera, que llaman «salvaje» a lo que no entienden. Arguedas no idealiza la violencia de la corrida, pero muestra que para los comuneros prohibirla es otra forma de quitarles lo suyo.",
            "Clave para leer: fíjate en cómo cambia el castellano cuando hablan los comuneros. Arguedas lo mezcla con palabras y giros del quechua para que el lector sienta el idioma de los Andes. Fíjate también en quién decide sobre la fiesta y quién la vive.",
            NOTA,
        ],
        "glossary": [
            {"word": "Yawar", "meaning": "Sangre, en quechua. Yawar punchay es «día de sangre», como llaman los comuneros a su corrida."},
            {"word": "Ayllu", "meaning": "Comunidad o barrio unido por parentesco y trabajo común. Puquio tiene cuatro."},
            {"word": "Misti", "meaning": "Así llaman en los Andes al vecino blanco o mestizo con poder, muchas veces dueño de tierras."},
            {"word": "Subprefecto", "meaning": "Autoridad que representa al gobierno en una provincia."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Qué ordena el gobierno sobre la corrida de Puquio?", "options": ["Hacerla dos veces al año", "Prohibir la corrida a la manera andina y hacer una corrida «a la española» con torero profesional", "Cobrar entrada a los comuneros", "Trasladarla a Lima"], "answer": 1, "explanation": "La orden declara bárbara la corrida de los comuneros y trae un torero para reemplazarla."},
            {"level": "inferencial", "question": "¿Por qué traer al Misitu es tan importante para el ayllu de K'ayau?", "options": ["Porque es un toro manso y fácil", "Porque capturar al toro salvaje de la puna es una hazaña colectiva que demuestra el valor y el orgullo del ayllu", "Porque el subprefecto se lo pidió", "Porque así ganarán dinero"], "answer": 1, "explanation": "El Misitu es casi una leyenda: llevarlo a la plaza es una forma de afirmar la fuerza de la comunidad."},
            {"level": "inferencial", "question": "Los estudiantes puquianos de Lima apoyan la prohibición. ¿Qué muestra eso?", "options": ["Que odian a su pueblo", "Que hasta los hijos del pueblo, educados afuera, pueden mirar su propia cultura con los ojos de quienes la desprecian", "Que el gobierno les pagó", "Que no conocen Puquio"], "answer": 1, "explanation": "Quieren que su pueblo «progrese», pero aceptan una idea de progreso que borra la cultura de los comuneros."},
            {"level": "critico", "question": "¿Qué crítica hace la novela cuando el Estado decide sobre una fiesta que no es suya?", "options": ["Que las leyes siempre tienen razón", "Que imponer costumbres desde el poder, sin escuchar a la comunidad, es otra forma de dominio, como el despojo de sus tierras", "Que las fiestas no importan", "Que los comuneros deben irse a Lima"], "answer": 1, "explanation": "La prohibición se suma al despojo: los poderosos deciden qué es civilizado y qué no."},
            {"level": "critico", "question": "La corrida andina es violenta y puede causar muertes. ¿Cuál es una lectura justa de la novela?", "options": ["Arguedas aplaude que haya muertos", "La novela no oculta la violencia, pero pregunta quién tiene derecho a decidir sobre la cultura de un pueblo", "La novela dice que hay que prohibir todas las fiestas", "La violencia no aparece"], "answer": 1, "explanation": "Una lectura crítica reconoce las dos cosas: el riesgo de la fiesta y el desprecio con que se la prohíbe."},
        ],
        "reflexion": [
            "¿Hay en tu comunidad una costumbre que gente de afuera critica sin conocerla? ¿Quién debería decidir si cambia?",
            "¿Se puede defender una tradición y, al mismo tiempo, querer que sea menos peligrosa? ¿Cómo lo harías?",
        ],
    },
    "guia-sueno-del-pongo": {
        "title": "Guía de lectura: El sueño del pongo",
        "author": "José María Arguedas (guía de Sinapse)",
        "region": "sierra",
        "coverColor": "#5A4632",
        "summary": "Guía para leer el relato que Arguedas recogió de la tradición oral quechua (1965): un siervo humillado por su patrón le cuenta un sueño en el que, ante San Francisco, los papeles se invierten. Contexto, temas y preguntas.",
        "texto": [
            "El sueño del pongo es un relato breve que José María Arguedas publicó en 1965, en quechua y en castellano. Él mismo contó que no lo inventó: lo escuchó de un comunero en Lima y lo reescribió. Es un cuento de la tradición oral andina.",
            "Un pongo era un indígena obligado a servir gratis en la casa de la hacienda, por turnos, como parte de lo que el patrón exigía a los colonos. Ese servicio existió en el Perú hasta la reforma agraria de 1969. El relato habla, entonces, de una injusticia real.",
            "El protagonista es un hombre pequeño, débil y pobre que llega a cumplir su turno de pongo. El patrón se burla de él desde el primer día. Delante de los demás sirvientes lo humilla: le ordena comportarse como un perro y como una vizcacha, y lo trata como si no fuera una persona. El pongo obedece en silencio.",
            "Una noche, el pongo pide permiso para hablar. Le dice al patrón que ha tenido un sueño en el que los dos habían muerto y estaban desnudos ante nuestro gran padre San Francisco, que podía ver lo que había en el corazón de cada uno.",
            "En el sueño, San Francisco ordena a un ángel hermoso que cubra al patrón con miel. A otro ángel, viejo y feo, le ordena cubrir al pongo con excremento. El patrón escucha satisfecho: le parece que el sueño confirma su lugar en el mundo.",
            "Pero el sueño no termina ahí. El pongo cuenta que San Francisco dio una última orden: que los dos se lamieran el uno al otro, despacio, por toda la eternidad. Con esa imagen, el sirviente humillado le devuelve al patrón toda la humillación, sin levantar la voz.",
            "Temas: el abuso de poder; la dignidad de quien parece no tener voz; y la justicia que no llega en este mundo, pero que la imaginación popular sí puede pensar. El pongo no se rebela con violencia: se rebela contando una historia.",
            "Clave para leer: observa el contraste entre el silencio del pongo durante casi todo el relato y la fuerza de sus palabras al final. Pregúntate por qué el patrón lo deja hablar, y qué cambia cuando el sueño da su último giro.",
            "Este relato se lee mucho en secundaria junto con Paco Yunque, de César Vallejo, que está completo en Sinapse. Los dos muestran cómo la desigualdad entre patrones y siervos llega hasta la vida diaria: el aula en un caso, la casa de hacienda en el otro.",
            NOTA,
        ],
        "glossary": [
            {"word": "Pongo", "meaning": "Indígena obligado a servir sin pago en la casa del hacendado, por turnos. Existió hasta 1969."},
            {"word": "Hacienda", "meaning": "Gran propiedad agrícola cuyo dueño, el hacendado, tenía poder sobre los colonos que vivían en ella."},
            {"word": "Vizcacha", "meaning": "Roedor de los Andes, parecido a un conejo. El patrón obliga al pongo a imitarla para burlarse de él."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Cómo llegó este relato a Arguedas?", "options": ["Lo inventó de niño", "Lo escuchó de un comunero y lo reescribió en quechua y castellano", "Lo tradujo del inglés", "Lo encontró en un libro de la colonia"], "answer": 1, "explanation": "Es un cuento de la tradición oral quechua que Arguedas recogió y reescribió."},
            {"level": "inferencial", "question": "¿Por qué el patrón escucha contento la primera parte del sueño?", "options": ["Porque ama al pongo", "Porque cree que el sueño confirma que él merece lo dulce y el pongo lo sucio, como en la vida", "Porque no entiende el quechua", "Porque está dormido"], "answer": 1, "explanation": "La miel y el excremento parecen repetir la jerarquía de la hacienda."},
            {"level": "inferencial", "question": "¿Qué logra la última orden de San Francisco en el sueño?", "options": ["Que el pongo pida perdón", "Que los dos queden unidos por la humillación: el patrón tendrá que lamer al pongo por toda la eternidad", "Que el patrón vaya al cielo solo", "Nada, el sueño se olvida"], "answer": 1, "explanation": "El giro final invierte el poder: el que humillaba queda humillado."},
            {"level": "critico", "question": "¿Por qué se dice que el pongo se rebela «con palabras»?", "options": ["Porque grita insultos", "Porque, sin violencia y sin que el patrón pueda castigarlo por un sueño, le devuelve la humillación contando una historia", "Porque escribe una carta al gobierno", "Porque se va de la hacienda"], "answer": 1, "explanation": "La imaginación y el relato son su arma: dice lo que no podría decir de otra forma."},
            {"level": "critico", "question": "¿Qué relación tiene el relato con la historia del Perú?", "options": ["Ninguna, es fantasía", "Denuncia un sistema de servidumbre real en las haciendas andinas, que duró hasta la reforma agraria", "Habla de la conquista española", "Trata sobre la vida en Lima"], "answer": 1, "explanation": "El pongueaje fue real: el cuento convierte esa injusticia en una historia que se recuerda."},
        ],
        "reflexion": [
            "¿Has visto en tu entorno a alguien que humilla a otro porque tiene más poder? ¿Qué puede hacer quien observa?",
            "El pongo usa un sueño para decir la verdad. ¿Qué formas tienen hoy las personas sin poder para hacerse escuchar?",
        ],
    },
    "guia-rios-profundos": {
        "title": "Guía de lectura: Los ríos profundos",
        "author": "José María Arguedas (guía de Sinapse)",
        "region": "sierra",
        "coverColor": "#2F4A5A",
        "summary": "Guía para leer la novela más conocida de Arguedas (1958): Ernesto, un adolescente que creció entre indígenas, vive internado en un colegio religioso de Abancay. Un zumbayllu, un motín de chicheras y una peste. Contexto, personajes y preguntas.",
        "texto": [
            "Los ríos profundos se publicó en 1958 y es considerada la obra mayor de José María Arguedas. Tiene mucho de su propia vida: el narrador, Ernesto, es un adolescente que creció entre indígenas y viaja por los Andes con su padre, un abogado que va de pueblo en pueblo.",
            "La novela empieza en el Cusco. Ernesto y su padre visitan a un pariente rico y avaro, al que llaman el Viejo. Ernesto camina por la ciudad y se detiene ante un muro inca de piedras enormes. Siente que las piedras están vivas y que se mueven como un río. Esa manera de mirar el mundo, donde las cosas tienen vida, recorre todo el libro.",
            "Después el padre deja a Ernesto internado en un colegio religioso de Abancay, dirigido por el Padre Director. El colegio es un mundo duro: hay peleas, abusos entre los alumnos mayores y menores, y una violencia que Ernesto no entiende. Él extraña a su padre y a los indígenas que lo criaron.",
            "Entre los compañeros hay personajes inolvidables: Antero, que trae al colegio un zumbayllu, un trompo que zumba al bailar y que para Ernesto tiene algo mágico; Palacios, un muchacho de la sierra que sufre para aprender; y otros internos que se burlan o protegen según el momento. En el patio también vive una mujer con discapacidad mental, la opa Marcelina, de quien abusan algunos internos mayores. Ese episodio muestra la crueldad del lugar.",
            "Un día estalla un motín. Las chicheras de Abancay, mujeres que venden chicha y comida, se rebelan porque la sal, que necesitan para vivir, se la están guardando para el ganado de las haciendas. La líder, doña Felipa, toma la sal y la reparte entre los pobres y los colonos. Ernesto la sigue y se emociona: por primera vez ve a los débiles enfrentar a los poderosos.",
            "El Padre Director predica a los colonos de las haciendas y les pide obediencia. Ernesto lo ve hacer llorar a los indígenas en nombre de Dios para que sigan aceptando su servidumbre. Eso le duele y lo confunde, porque también quiere al colegio y a algunos de los padres.",
            "Al final llega la peste del tifus a Abancay. Los colonos de las haciendas, que viven en la miseria, bajan en masa a la ciudad para pedir una misa que los proteja. El colegio cierra y Ernesto se va, solo, hacia la hacienda de su pariente. Cruza el río y la novela termina con su partida.",
            "Temas: el choque entre dos mundos, el andino y el criollo, que Ernesto lleva dentro; la violencia del colegio y de las haciendas; la rebeldía de las chicheras; y la música, los huaynos, los ríos y los trompos como refugio y fuerza.",
            "Clave para leer: los capítulos no avanzan solo por la acción, también por la memoria y por los cantos. Cuando aparezca un huayno o una palabra en quechua, detente: Arguedas los usa para que sientas lo que Ernesto siente. Puedes comparar a Ernesto con el niño de El caballero Carmelo, que también recuerda su niñez, pero en la costa.",
            NOTA,
        ],
        "glossary": [
            {"word": "Zumbayllu", "meaning": "Trompo que zumba al girar. En la novela es casi un objeto mágico que une a Ernesto con su mundo."},
            {"word": "Chichera", "meaning": "Mujer que prepara y vende chicha y comida en las chicherías."},
            {"word": "Colono", "meaning": "Indígena que vive en la hacienda y trabaja para el hacendado a cambio de un pedazo de tierra."},
            {"word": "Huayno", "meaning": "Música y baile tradicional de los Andes."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Por qué se rebelan las chicheras de Abancay?", "options": ["Porque cerraron el colegio", "Porque la sal que necesitan se guarda para el ganado de las haciendas", "Porque subió el precio de la chicha", "Porque llegó la peste"], "answer": 1, "explanation": "Doña Felipa encabeza el motín y reparte la sal entre los pobres y los colonos."},
            {"level": "inferencial", "question": "¿Qué significa para Ernesto el muro inca del Cusco?", "options": ["Nada, solo son piedras", "Siente que las piedras están vivas: es su manera andina de mirar el mundo, donde las cosas tienen vida", "Un lugar para jugar", "La casa del Viejo"], "answer": 1, "explanation": "Desde el comienzo la novela muestra que Ernesto percibe el mundo como lo aprendió de los indígenas."},
            {"level": "inferencial", "question": "¿Por qué el zumbayllu es tan importante para Ernesto?", "options": ["Porque es caro", "Porque su zumbido lo consuela y lo conecta con el mundo andino que extraña, en medio de la dureza del colegio", "Porque se lo regaló el Padre Director", "Porque gana apuestas con él"], "answer": 1, "explanation": "El trompo es un refugio: para Ernesto tiene algo de mágico y de música."},
            {"level": "critico", "question": "¿Qué crítica hace la novela con el sermón del Padre Director a los colonos?", "options": ["Que la religión siempre libera", "Que el poder puede usar la fe para que los oprimidos acepten su servidumbre", "Que los colonos son malos", "Que el colegio es perfecto"], "answer": 1, "explanation": "Ernesto ve que el sermón hace llorar a los colonos para que sigan obedeciendo, y eso lo hiere."},
            {"level": "critico", "question": "Ernesto está entre dos mundos. ¿Qué tensión vive?", "options": ["Entre la costa y la selva", "Entre el mundo andino que lo crió y el mundo de los blancos y mestizos del colegio, sin pertenecer del todo a ninguno", "Entre dos colegios", "Entre su padre y su madre"], "answer": 1, "explanation": "Esa división es el centro de la novela y de la experiencia del propio Arguedas."},
        ],
        "reflexion": [
            "¿Hay algún objeto, canción o lugar que te dé fuerza cuando estás lejos de casa, como el zumbayllu a Ernesto?",
            "¿Qué harías si vieras abusar de alguien en tu colegio, como pasa con la opa Marcelina? ¿Qué impide a veces intervenir?",
        ],
    },
    "guia-ciudad-y-los-perros": {
        "title": "Guía de lectura: La ciudad y los perros",
        "author": "Mario Vargas Llosa (guía de Sinapse)",
        "region": "costa",
        "coverColor": "#3A3F2E",
        "summary": "Guía para leer la novela con la que Vargas Llosa se hizo famoso (1963): en el Colegio Militar Leoncio Prado de Lima, el robo de un examen y la muerte de un cadete destapan un mundo de violencia y silencio. Contexto, personajes y preguntas.",
        "texto": [
            "La ciudad y los perros es la primera novela de Mario Vargas Llosa, nacido en Arequipa en 1936, premio Nobel de Literatura en 2010 y fallecido en 2025. Se publicó en 1963 y ganó premios en España. En el Colegio Leoncio Prado se quemaron ejemplares del libro, porque mostraba lo que pasaba dentro. Vargas Llosa había estudiado allí.",
            "La novela ocurre en el Colegio Militar Leoncio Prado, en el Callao, donde estudian internos de todas las clases sociales y regiones del Perú. A los alumnos de primer año los llaman «perros»: deben soportar el bautizo y los abusos de los mayores. «La ciudad» es Lima, el mundo de afuera, al que salen los fines de semana.",
            "Dentro del colegio, un grupo de cadetes forma el Círculo, una banda que se protege y se venga de los abusos. Lo dirige el Jaguar, el más fuerte y temido. Para sobrevivir, en el colegio rige una regla: no se acusa a nadie.",
            "Un cadete del Círculo, Cava, roba las preguntas de un examen de química. Lo descubren a medias, y como nadie confiesa, los oficiales castigan a todos sin salida. Ricardo Arana, al que llaman el Esclavo porque todos lo humillan, quiere salir a ver a una muchacha, Teresa. Por eso denuncia a Cava. Cava es expulsado.",
            "Poco después, durante un ejercicio militar en el campo, Arana recibe un disparo en la cabeza y muere. Los oficiales dicen que fue un accidente. Alberto Fernández, al que llaman el Poeta porque escribe cartas y novelitas que vende a sus compañeros, era amigo de Arana. Está convencido de que el Jaguar lo mató para vengar a Cava y lo acusa ante el teniente Gamboa.",
            "Gamboa es un oficial recto que cree en el reglamento y decide investigar. Pero el colegio no quiere un escándalo. Los superiores presionan a Alberto con las novelitas que ha escrito, que podrían hacer que lo expulsen, y él retira la acusación. El caso se cierra como un accidente. Gamboa, por insistir en la verdad, es trasladado a un puesto lejano en la sierra.",
            "Al final, el Jaguar le confiesa a Gamboa que él mató a Arana. Gamboa le responde que ya es tarde: nadie quiere oír esa verdad. Los cadetes terminan el colegio y vuelven a la ciudad, cada uno con lo que vivió.",
            "Personajes para seguir: el Jaguar, que encarna la fuerza y la ley de la venganza; el Poeta, que duda entre decir la verdad y salvarse; el Esclavo, víctima de todos; y el teniente Gamboa, que cree en la justicia de una institución que lo traiciona. La novela salta en el tiempo y cambia de narrador. A veces no sabes quién habla: esa confusión es parte de la lectura.",
            "Temas: la violencia como forma de hacerse hombre; el silencio cómplice; la corrupción de una institución que prefiere su imagen a la verdad; y las diferencias de clase y de origen que el colegio mezcla, pero no borra.",
            "Clave para leer: es una novela para lectores de los últimos años de secundaria, con escenas de violencia y lenguaje fuerte. Puedes leerla junto con El vencedor y Paco Yunque, de César Vallejo, que están completos en Sinapse: también muestran la violencia entre escolares y cómo los adultos la miran o la tapan.",
            NOTA,
        ],
        "glossary": [
            {"word": "Cadete", "meaning": "Alumno de un colegio o escuela militar."},
            {"word": "Perro", "meaning": "En la novela, así llaman a los cadetes de primer año, que sufren los abusos de los mayores."},
            {"word": "Encubrir", "meaning": "Ocultar un delito o una falta para que no se sepa ni se castigue."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Por qué Ricardo Arana, el Esclavo, denuncia el robo del examen?", "options": ["Porque odiaba la química", "Porque el castigo colectivo le impedía salir a ver a Teresa", "Porque el Jaguar se lo pidió", "Porque quería ser oficial"], "answer": 1, "explanation": "Sin salida por el castigo, Arana rompe la regla de no acusar para poder salir."},
            {"level": "inferencial", "question": "¿Por qué Alberto, el Poeta, retira su acusación contra el Jaguar?", "options": ["Porque descubre que es inocente", "Porque los superiores lo presionan con las novelitas que escribió y teme que lo expulsen", "Porque Gamboa se lo ordena", "Porque el Jaguar lo amenaza en público"], "answer": 1, "explanation": "El colegio usa una falta de Alberto para comprar su silencio."},
            {"level": "inferencial", "question": "¿Qué le pasa al teniente Gamboa por insistir en investigar?", "options": ["Lo ascienden", "Lo trasladan a un puesto lejano: la institución castiga al que busca la verdad", "Lo nombran director", "Nada"], "answer": 1, "explanation": "Gamboa cree en el reglamento, pero el colegio prefiere evitar el escándalo."},
            {"level": "critico", "question": "¿Qué critica la novela con el cierre del caso como «accidente»?", "options": ["Que los accidentes son comunes", "Que una institución puede preferir su prestigio a la justicia, y que el silencio de todos permite la violencia", "Que los cadetes son todos culpables", "Que la escuela militar es perfecta"], "answer": 1, "explanation": "La verdad existe, pero nadie con poder quiere oírla."},
            {"level": "critico", "question": "Al final el Jaguar confiesa, y Gamboa responde que ya es tarde. ¿Qué sentido tiene?", "options": ["Que la confesión arregla todo", "Que, cuando el sistema ya decidió callar, la verdad llega tarde y no cambia nada: la justicia depende de instituciones dispuestas a escucharla", "Que Gamboa no le cree", "Que el Jaguar miente"], "answer": 1, "explanation": "El final amargo muestra el precio del silencio institucional."},
        ],
        "reflexion": [
            "En el colegio de la novela la regla es «no acusar». ¿Cuándo callar protege a un grupo y cuándo protege al abusador?",
            "¿Conoces una situación en que una institución, una escuela o una empresa, prefirió ocultar un problema antes que resolverlo? ¿Qué consecuencias tuvo?",
        ],
    },
}


def main():
    obras_f = AQUI / "obras.json"
    obras = json.loads(obras_f.read_text(encoding="utf-8"))
    cuest_f = AQUI / "cuestionarios.json"
    cuest = json.loads(cuest_f.read_text(encoding="utf-8"))
    for id_, g in GUIAS.items():
        (AQUI / "textos" / f"{id_}.es.json").write_text(json.dumps(g["texto"], ensure_ascii=False, indent=0), encoding="utf-8")
        obras[id_] = {
            "title": g["title"], "author": g["author"], "collection": "Guías de lectura", "region": g["region"],
            "coverColor": g["coverColor"], "narrator": None, "summary": g["summary"], "glossary": g["glossary"],
            "quiz": g["quiz"], "original": False,
            "source": "Guía de lectura escrita por el equipo de Sinapse. No reproduce el texto de la obra, que tiene derechos de autor.",
        }
        cuest[id_] = {"quiz": g["quiz"], "reflexion": g["reflexion"]}
    obras_f.write_text(json.dumps(obras, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    cuest_f.write_text(json.dumps(cuest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("guías:", ", ".join(GUIAS))


if __name__ == "__main__":
    main()
