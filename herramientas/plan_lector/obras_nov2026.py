"""Agrega a obras.json y cuestionarios.json cinco obras de dominio público afines a Arguedas y al plan lector.

    python herramientas/plan_lector/obras_nov2026.py

Vallejo (m. 1938) y Valdelomar (m. 1919) son de dominio público en el Perú. Textos de Wikisource en español,
ya limpios en textos/<id>.es.json. Sin grabación humana: en castellano se escuchan con la voz del teléfono.
"""
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent

OBRAS = {
    "el-vencedor": {
        "title": "El vencedor", "author": "César Vallejo", "collection": "Cuentos", "region": "sierra", "coverColor": "#5B4A3A",
        "summary": "A la salida de la escuela, dos niños se pelean ante todos sus compañeros: Juncos, descalzo y pobre, y Cancio, hijo de buena familia. El narrador cambia de bando en plena pelea. Un cuento breve sobre la violencia y la compasión.",
        "glossary": [
            {"word": "Contrincante", "meaning": "Persona que compite o pelea contra otra."},
            {"word": "Granuja", "meaning": "Muchacho pobre y callejero; a veces se dice con cariño."},
            {"word": "Bayeta", "meaning": "Tela de lana gruesa y sencilla, usada por la gente pobre del campo."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Quiénes se enfrentan y en qué se diferencian?", "options": ["Dos hermanos de la misma familia", "Juncos, descalzo y pobremente vestido, y Cancio, hijo de buena familia con zapatos nuevos", "El narrador y Leonidas", "Dos profesores"], "answer": 1, "explanation": "Vallejo describe con cuidado la ropa y los pies de cada uno: la pelea es también entre dos clases sociales."},
            {"level": "inferencial", "question": "¿Por qué el narrador se pasa al bando de Juncos en plena pelea?", "options": ["Porque Juncos le pagó", "Porque al verlo golpeado, en harapos y con los pies desnudos, siente compasión y le duele el corazón", "Porque Cancio lo insultó", "Porque quería ganar la apuesta"], "answer": 1, "explanation": "Primero simpatiza con Cancio, pero la imagen del niño pobre castigado lo hace cambiar."},
            {"level": "inferencial", "question": "Juncos gana, pero al final está solo y llorando. ¿Por qué?", "options": ["Porque le duele la oreja", "Porque nadie celebra su triunfo: todos rodean al vencido y él siente vergüenza de haber golpeado a Cancio", "Porque perdió su sombrero", "Porque lo castigó el profesor"], "answer": 1, "explanation": "El título es irónico: el vencedor no gana nada y queda apartado."},
            {"level": "critico", "question": "¿Qué papel cumplen los demás niños durante la pelea?", "options": ["Intentan detenerla desde el principio", "Gritan, apuestan como en una pelea de gallos y convierten el dolor ajeno en espectáculo", "Llaman a los padres", "No están presentes"], "answer": 1, "explanation": "El cuento critica al público que alienta la violencia y después se compadece."},
            {"level": "critico", "question": "¿Qué sugiere el gesto final de Leonidas, que arregla el sombrero y el pelo de Juncos?", "options": ["Que se burla de él", "Que la ternura y el cuidado del otro son posibles aun después de la violencia, y que el vencedor también es una víctima", "Que quiere pelear con él", "Que es su hermano"], "answer": 1, "explanation": "Vallejo cierra con un acto de compasión hacia el que nadie mira."},
        ],
        "reflexion": [
            "¿Alguna vez viste una pelea en el colegio en que los demás alentaban en vez de detenerla? ¿Qué se podía hacer?",
            "¿Por qué crees que nadie celebra a Juncos? ¿Qué dice eso sobre ganar a golpes?",
        ],
    },
    "los-caynas": {
        "title": "Los caynas", "author": "César Vallejo", "collection": "Escalas (1923)", "region": "sierra", "coverColor": "#3E4A3A",
        "summary": "Un hombre vuelve a Cayna, su pueblo de la sierra, después de años en Lima, y descubre que su padre y todo el pueblo se creen monos. Cuando intenta hacerlos recordar que son hombres, lo llaman loco. Un cuento extraño y perturbador sobre la razón y la locura.",
        "glossary": [
            {"word": "Alienado", "meaning": "Persona que ha perdido la razón; enfermo mental, en el lenguaje antiguo."},
            {"word": "Antropoide", "meaning": "Parecido al ser humano; se dice de los monos grandes, como el gorila."},
            {"word": "Asilo", "meaning": "Aquí, hospital donde se internaba a los enfermos mentales."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Qué descubre el narrador al volver a Cayna?", "options": ["Que su familia se mudó a Lima", "Que su padre, su familia y todo el pueblo se creen monos y viven como tales", "Que el pueblo fue destruido por un terremoto", "Que Urquizo se curó"], "answer": 1, "explanation": "La locura de la familia Urquizo se ha extendido a todo el pueblo."},
            {"level": "literal", "question": "¿Qué dice el padre cuando el narrador grita que todos son hombres?", "options": ["Que tiene razón", "«¡Pobre! Se cree hombre. Está loco...»", "Que se vaya del pueblo", "Nada, no lo oye"], "answer": 1, "explanation": "Para los del pueblo, el loco es quien no comparte su creencia."},
            {"level": "inferencial", "question": "¿Qué revela el final, cuando aparece el enfermero?", "options": ["Que el narrador es médico", "Que quien contaba la historia está internado en un asilo: no sabemos si el pueblo estaba loco o si lo está él", "Que todo fue un sueño del padre", "Que Cayna no existe"], "answer": 1, "explanation": "El giro final pone en duda todo lo que el lector creyó."},
            {"level": "inferencial", "question": "¿Por qué es importante la escena en que Urquizo, el loco, le pregunta al narrador «¿Está usted loco?»", "options": ["Porque es un chiste", "Porque anticipa el tema del cuento: cada uno cree estar cuerdo y ve loco al otro", "Porque Urquizo es su padre", "Porque el narrador lo golpeó a propósito"], "answer": 1, "explanation": "Desde ahí el narrador empieza a pensar que la razón depende del punto de vista."},
            {"level": "critico", "question": "¿Qué pregunta plantea el cuento sobre la «normalidad»?", "options": ["Que los monos son superiores", "Si lo normal es solo lo que cree la mayoría: el que piensa distinto puede ser tratado como loco", "Que no hay que estudiar en Lima", "Ninguna, es solo terror"], "answer": 1, "explanation": "Vallejo convierte una historia de terror en una pregunta sobre la razón y la mayoría."},
        ],
        "reflexion": [
            "¿Te ha pasado que un grupo piense algo y tú, por pensar distinto, quedes como el «raro»? ¿Quién tenía razón?",
            "El narrador vuelve tras muchos años fuera y no reconoce su pueblo. ¿Qué se siente volver a un lugar que cambió?",
        ],
    },
    "chaymanta-huaynuy": {
        "title": "Chaymanta Huayñuy (Más allá de la muerte)", "author": "Abraham Valdelomar", "collection": "Los hijos del Sol (1921)", "region": "sierra", "coverColor": "#6A4B2A",
        "summary": "En el camino del Inca, unos pastores encuentran a Ñausa Soncco, un ciego maldito por el Sol. Él les cuenta cómo, por amor, robó en el templo del Sol y lo perdió todo. Una leyenda de Los hijos del Sol sobre el amor, la culpa y los dioses.",
        "glossary": [
            {"word": "Chaymanta huayñuy", "meaning": "Expresión quechua que Valdelomar traduce como «más allá de la muerte»."},
            {"word": "Coricancha", "meaning": "El gran templo del Sol en el Cusco, cubierto de oro."},
            {"word": "Supay", "meaning": "En la tradición andina, espíritu del mundo de abajo; los cronistas lo asociaron con el demonio."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Por qué Ñausa Soncco es «el hombre maldito del Sol»?", "options": ["Porque mató a un Inca", "Porque, por amor, robó objetos sagrados del templo del Sol para su amada", "Porque no quiso trabajar", "Porque nació ciego"], "answer": 1, "explanation": "Para conquistar a su amada roba al Sol, y ese sacrilegio trae su castigo."},
            {"level": "literal", "question": "¿Qué ocurre con la amada cuando él le muestra lo robado?", "options": ["Acepta casarse", "Huye espantada, «¡Has robado al Sol!», y al escapar cae al río", "Lo denuncia al Inca", "Se queda con el oro"], "answer": 1, "explanation": "Ella no acepta el sacrilegio; en la huida resbala y cae al río."},
            {"level": "inferencial", "question": "¿Por qué Ñausa pide a los pastores que se alejen «a un tiro de honda»?", "options": ["Porque tiene una enfermedad", "Porque se cree maldito y no quiere que su culpa los alcance, ni siquiera por el aire o la nube que los cubra", "Porque no le gustan los pastores", "Porque quiere estar solo para comer"], "answer": 1, "explanation": "Su maldición es tan grande que teme contagiarla."},
            {"level": "critico", "question": "Valdelomar escribe esta leyenda inca en un castellano muy adornado. ¿Qué busca con eso?", "options": ["Que sea difícil a propósito", "Dar al pasado incaico la grandeza de una epopeya, como si fuera un mito antiguo", "Burlarse de los incas", "Imitar el habla de Lima"], "answer": 1, "explanation": "El estilo solemne convierte la historia en leyenda; es típico del modernismo."},
            {"level": "critico", "question": "Compara a Ñausa con un personaje de tragedia. ¿Qué tienen en común?", "options": ["Nada", "Un error movido por la pasión que desafía a los dioses y termina en un castigo que ya no se puede reparar", "Que ambos son reyes", "Que terminan felices"], "answer": 1, "explanation": "Como en la tragedia, la falta y el castigo son inseparables."},
        ],
        "reflexion": [
            "¿Hasta dónde se puede llegar por amor? ¿Hay límites que no se deberían cruzar?",
            "Esta leyenda es inventada por Valdelomar, pero usa dioses y lugares incas. ¿Qué diferencia hay entre una leyenda de autor y un mito de un pueblo?",
        ],
    },
    "los-hermanos-ayar": {
        "title": "Los hermanos Ayar", "author": "Abraham Valdelomar", "collection": "Los hijos del Sol (1921)", "region": "sierra", "coverColor": "#8A6A2A",
        "summary": "El sumo sacerdote le cuenta a su sobrino, el joven príncipe Quespi-Titu, cómo los cuatro hermanos Ayar y sus mujeres salieron de Pacaritambo, guiados por el Sol, a fundar el Cusco. Ayar Cachi, el más fuerte y violento, es apartado por sus propios hermanos. La leyenda del origen de los incas, contada por Valdelomar.",
        "glossary": [
            {"word": "Amauta", "meaning": "Sabio y maestro en el imperio de los incas."},
            {"word": "Pacaritambo", "meaning": "Lugar de origen de los Ayar según la leyenda: el cerro de las tres ventanas."},
            {"word": "Indi", "meaning": "Aquí, el ave sagrada que lleva Manco; en quechua, inti es el Sol."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Cómo sabrá Ayar Manco dónde fundar la ciudad?", "options": ["Por un sueño de Mama Ojllo", "Donde se hunda el báculo de oro que le dio su padre el Sol", "Donde encuentre un río", "Donde lo decida el pueblo"], "answer": 1, "explanation": "El Sol le dice que, donde el báculo se hunda en la tierra, allí debe fundar."},
            {"level": "inferencial", "question": "¿Qué representa cada hermano Ayar según el cuento?", "options": ["Cuatro regiones del Perú", "Distintas cualidades: Manco la prudencia, Uchu la contemplación, Auca la estrategia y Cachi la fuerza impulsiva", "Cuatro dioses", "Cuatro edades del Inca"], "answer": 1, "explanation": "Valdelomar describe a cada uno con una virtud y un carácter distintos."},
            {"level": "inferencial", "question": "¿Por qué los hermanos deciden apartar a Ayar Cachi?", "options": ["Porque estaba enfermo", "Porque su fuerza y su violencia, útiles en la guerra, también dañan y ponen en peligro al pueblo que buscan fundar", "Porque se enamoró", "Porque quería volver a casa"], "answer": 1, "explanation": "Lo mandan con un pretexto a Pacaritambo, con Tampu Cachay, que lo encierra en la cueva para librarse de él."},
            {"level": "critico", "question": "Ayar Manco da de beber a una cautiva en vez de matarla. ¿Qué contraste plantea el cuento?", "options": ["Entre la costa y la sierra", "Entre conquistar con la fuerza, como Cachi, y ganarse a los pueblos con generosidad, como Manco", "Entre el día y la noche", "Ninguno"], "answer": 1, "explanation": "La leyenda presenta dos maneras de fundar un imperio."},
            {"level": "critico", "question": "Los fundadores dicen que conquistarán «con amor o con sangre». ¿Cómo lees esa frase hoy?", "options": ["Como un consejo para la vida diaria", "Como la idea, común en los relatos de fundación, de que un imperio nace también de la violencia contra otros pueblos", "Como una canción de amor", "Como una broma"], "answer": 1, "explanation": "Una lectura crítica nota que la gloria del origen esconde a los pueblos sometidos."},
        ],
        "reflexion": [
            "¿Conoces otra versión de la fundación del Cusco (Manco Cápac y Mama Ocllo en el lago Titicaca)? ¿En qué se parecen y en qué no?",
            "¿Es justo lo que los hermanos hacen con Ayar Cachi? ¿Qué harías con alguien muy valioso pero peligroso para el grupo?",
        ],
    },
    "el-camino-hacia-el-sol": {
        "title": "El camino hacia el sol", "author": "Abraham Valdelomar", "collection": "Los hijos del Sol (1921)", "region": "costa", "coverColor": "#A65A2A",
        "summary": "Llega la noticia: los extranjeros han tomado el Cusco y el Inca ha muerto. Un pueblo entero, con el joven Sumaj y su amada Inquill, emprende un éxodo en busca del Sol, hasta llegar al mar. Una leyenda triste sobre el fin de un mundo.",
        "glossary": [
            {"word": "Éxodo", "meaning": "Salida de un pueblo entero de su tierra, en busca de otro lugar."},
            {"word": "Curaca", "meaning": "Jefe de un pueblo o de un ayllu en tiempos de los incas."},
            {"word": "Mitimaes", "meaning": "Grupos que el Inca trasladaba de una región a otra para poblarla o vigilarla."},
        ],
        "quiz": [
            {"level": "literal", "question": "¿Qué noticia hace que el pueblo abandone su ciudad?", "options": ["Una sequía", "Que los extranjeros destruyeron la ciudad sagrada y el Inca ha muerto", "Que el Sol se apagó", "Que llegó un nuevo curaca"], "answer": 1, "explanation": "El chasqui trae la noticia de la conquista; los amautas dicen que se ha cumplido el oráculo."},
            {"level": "literal", "question": "¿Qué encuentran al final del camino?", "options": ["El palacio del Sol", "El mar, una «laguna sin orillas» que no pueden cruzar", "Una ciudad nueva", "A los extranjeros"], "answer": 1, "explanation": "Creían que el Sol dormía en esa gran laguna; al llegar, no hay forma de seguir."},
            {"level": "inferencial", "question": "¿Por qué el pueblo decide enterrarse en la arena?", "options": ["Para esconderse del calor", "Porque se sienten abandonados por el Sol y prefieren morir juntos y en paz antes que caer en manos de los conquistadores", "Para buscar agua", "Por orden de los extranjeros"], "answer": 1, "explanation": "Los sabios concluyen que el Sol los ha abandonado y eligen la muerte como último refugio."},
            {"level": "critico", "question": "Sumaj queda vivo y solo después de enterrar a Inquill. ¿Qué representa?", "options": ["Al ganador de la historia", "Al último de un mundo que se acaba: ya nadie lo escuchará, porque su pueblo y su cultura han desaparecido", "A un conquistador", "A un traidor"], "answer": 1, "explanation": "El cuento lo llama «el último quechua»: es el fin de una civilización."},
            {"level": "critico", "question": "¿Qué visión de la conquista transmite Valdelomar con este cuento?", "options": ["Una aventura alegre", "Una catástrofe vivida desde los vencidos, con dolor y fe, no desde los conquistadores", "Una historia de comercio", "No habla de la conquista"], "answer": 1, "explanation": "La leyenda imagina cómo vivió un pueblo andino el fin de su mundo."},
        ],
        "reflexion": [
            "¿Desde qué punto de vista te enseñaron la conquista en el colegio? ¿Qué cambia al contarla desde los vencidos?",
            "Hoy también hay pueblos que dejan su tierra por guerras o pobreza. ¿Qué buscan y qué pierden?",
        ],
    },
}


def main():
    obras_f, cuest_f = AQUI / "obras.json", AQUI / "cuestionarios.json"
    obras = json.loads(obras_f.read_text(encoding="utf-8"))
    cuest = json.loads(cuest_f.read_text(encoding="utf-8"))
    for id_, o in OBRAS.items():
        reflexion = o.pop("reflexion")
        obras[id_] = {**o, "narrator": None}
        cuest[id_] = {"quiz": o["quiz"], "reflexion": reflexion}
    obras_f.write_text(json.dumps(obras, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    cuest_f.write_text(json.dumps(cuest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("obras:", ", ".join(OBRAS))


if __name__ == "__main__":
    main()
